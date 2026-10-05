function confirmAction(message) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal';
    dialog.innerHTML = `
      <div class="modal-header"><strong>Confirmar acción</strong></div>
      <div class="modal-body"><p>${message}</p></div>
      <div class="modal-footer">
        <button class="btn" data-action="cancel">Cancelar</button>
        <button class="btn btn-danger" data-action="confirm">Confirmar</button>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => {
      dialog.remove();
    });
    dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      resolve(false);
      dialog.close();
    });
    dialog.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      resolve(true);
      dialog.close();
    });
    dialog.showModal();
  });
}

window.confirmAction = confirmAction;
