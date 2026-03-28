(() => {
  const shell = document.getElementById('app');
  const layer = document.getElementById('pieceLayer');
  const pieces = [...document.querySelectorAll('.piece')];
  const targets = [...document.querySelectorAll('.target')];
  const progressCount = document.getElementById('progressCount');
  const endCard = document.getElementById('endCard');
  const ctaButton = document.getElementById('ctaButton');

  const state = new Map();
  const drag = {
    activeId: null,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
    matchedCount: 0,
    completed: false,
  };

  function getShellRect() {
    return shell.getBoundingClientRect();
  }

  function refreshLayout() {
    const shellRect = getShellRect();
    const traySlots = [...document.querySelectorAll('.tray-slot')];

    pieces.forEach((piece, index) => {
      const slotRect = traySlots[index].getBoundingClientRect();
      const x = slotRect.left - shellRect.left;
      const y = slotRect.top - shellRect.top;
      const width = slotRect.width;
      const height = slotRect.height;
      const prev = state.get(piece.dataset.piece) || {};

      const next = {
        ...prev,
        homeX: x,
        homeY: y,
        width,
        height,
        currentX: prev.matched ? prev.currentX : x,
        currentY: prev.matched ? prev.currentY : y,
      };

      state.set(piece.dataset.piece, next);

      if (!next.matched) {
        setPiecePosition(piece, next.currentX, next.currentY);
      }
    });

    targets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      const x = rect.left - shellRect.left;
      const y = rect.top - shellRect.top;
      const next = state.get(target.dataset.target) || {};
      state.set(target.dataset.target, {
        ...next,
        x,
        y,
        width: rect.width,
        height: rect.height,
      });
    });
  }

  function setPiecePosition(piece, x, y) {
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
  }

  function centerPieceOnTarget(piece, targetRect, pieceState) {
    const x = targetRect.x + targetRect.width / 2 - pieceState.width / 2;
    const y = targetRect.y + targetRect.height / 2 - pieceState.height / 2;
    pieceState.currentX = x;
    pieceState.currentY = y;
    setPiecePosition(piece, x, y);
  }

  function updateProgress() {
    progressCount.textContent = String(drag.matchedCount);
    targets.forEach((target) => {
      target.classList.toggle('filled', target.dataset.filled === 'true');
    });
  }

  function getTargetRect(targetId) {
    const targetEl = targets.find((el) => el.dataset.target === targetId);
    if (!targetEl) return null;
    const targetState = state.get(targetId);
    return targetState || null;
  }

  function setActiveTarget(targetId) {
    targets.forEach((target) => {
      target.classList.toggle('active', target.dataset.target === targetId);
    });
  }

  function clearActiveTarget() {
    targets.forEach((target) => target.classList.remove('active'));
  }

  function snapHome(piece, pieceState) {
    pieceState.currentX = pieceState.homeX;
    pieceState.currentY = pieceState.homeY;
    setPiecePosition(piece, pieceState.homeX, pieceState.homeY);
  }

  function markMatched(piece, targetEl, pieceState) {
    if (pieceState.matched) return;
    pieceState.matched = true;
    pieceState.currentX = state.get(targetEl.dataset.target).x + 12;
    pieceState.currentY = state.get(targetEl.dataset.target).y + 12;
    piece.classList.add('matched', 'settled');
    targetEl.dataset.filled = 'true';
    targetEl.classList.add('filled');
    drag.matchedCount += 1;
    updateProgress();
    piece.setAttribute('aria-disabled', 'true');
    piece.style.pointerEvents = 'none';

    if (drag.matchedCount === pieces.length) {
      window.setTimeout(showCompletion, 320);
    }
  }

  function showCompletion() {
    if (drag.completed) return;
    drag.completed = true;
    document.body.classList.add('is-complete');
    endCard.classList.add('show');
    endCard.setAttribute('aria-hidden', 'false');
    clearActiveTarget();
  }

  function getClickthroughUrl() {
    const query = new URLSearchParams(window.location.search);
    return window.clickTag || query.get('clickTag') || 'https://example.com';
  }

  function onPointerDown(event) {
    if (drag.completed) return;

    const piece = event.currentTarget;
    const pieceId = piece.dataset.piece;
    const pieceState = state.get(pieceId);
    if (!pieceState || pieceState.matched) return;

    drag.activeId = pieceId;
    drag.pointerId = event.pointerId;
    drag.offsetX = event.clientX - pieceState.currentX;
    drag.offsetY = event.clientY - pieceState.currentY;

    piece.setPointerCapture(event.pointerId);
    piece.classList.add('dragging');
    piece.style.zIndex = '10';
    setActiveTarget(pieceId);
  }

  function onPointerMove(event) {
    if (drag.completed || drag.activeId === null || event.pointerId !== drag.pointerId) return;

    const piece = pieces.find((el) => el.dataset.piece === drag.activeId);
    const pieceState = state.get(drag.activeId);
    if (!piece || !pieceState) return;

    const shellRect = getShellRect();
    const nextX = event.clientX - shellRect.left - drag.offsetX;
    const nextY = event.clientY - shellRect.top - drag.offsetY;

    pieceState.currentX = nextX;
    pieceState.currentY = nextY;
    setPiecePosition(piece, nextX, nextY);

    const targetRect = getTargetRect(drag.activeId);
    if (targetRect) {
      const centerX = nextX + pieceState.width / 2;
      const centerY = nextY + pieceState.height / 2;
      const withinX = centerX > targetRect.x + targetRect.width * 0.14 && centerX < targetRect.x + targetRect.width * 0.86;
      const withinY = centerY > targetRect.y + targetRect.height * 0.14 && centerY < targetRect.y + targetRect.height * 0.86;
      targets.forEach((target) => target.classList.toggle('active', target.dataset.target === drag.activeId && withinX && withinY));
    }
  }

  function onPointerUp(event) {
    if (drag.completed || drag.activeId === null || event.pointerId !== drag.pointerId) return;

    const piece = pieces.find((el) => el.dataset.piece === drag.activeId);
    const pieceState = state.get(drag.activeId);
    const targetEl = targets.find((el) => el.dataset.target === drag.activeId);
    const targetState = targetEl ? state.get(targetEl.dataset.target) : null;

    if (!piece || !pieceState || !targetEl || !targetState) {
      drag.activeId = null;
      drag.pointerId = null;
      clearActiveTarget();
      return;
    }

    const centerX = pieceState.currentX + pieceState.width / 2;
    const centerY = pieceState.currentY + pieceState.height / 2;
    const overlapX = centerX > targetState.x + targetState.width * 0.18 && centerX < targetState.x + targetState.width * 0.82;
    const overlapY = centerY > targetState.y + targetState.height * 0.18 && centerY < targetState.y + targetState.height * 0.82;

    piece.classList.remove('dragging');
    piece.style.zIndex = '4';

    if (overlapX && overlapY) {
      centerPieceOnTarget(piece, targetState, pieceState);
      markMatched(piece, targetEl, pieceState);
    } else {
      snapHome(piece, pieceState);
    }

    drag.activeId = null;
    drag.pointerId = null;
    clearActiveTarget();
  }

  function bindPiece(piece) {
    piece.addEventListener('pointerdown', onPointerDown);
    piece.addEventListener('pointermove', onPointerMove);
    piece.addEventListener('pointerup', onPointerUp);
    piece.addEventListener('pointercancel', onPointerUp);
    piece.addEventListener('lostpointercapture', onPointerUp);
  }

  function pulseScene() {
    const scene = document.querySelector('.scene');
    scene.animate(
      [
        { transform: 'translateY(4px)', opacity: 0.98 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      {
        duration: 420,
        easing: 'cubic-bezier(.2,.8,.2,1)',
      }
    );
  }

  ctaButton.addEventListener('click', () => {
    const url = getClickthroughUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  window.addEventListener('resize', () => {
    refreshLayout();
  });

  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => {
      refreshLayout();
    }, 120);
  });

  pieces.forEach(bindPiece);
  window.addEventListener('load', () => {
    refreshLayout();
    updateProgress();
    pulseScene();
  });
})();
