import Swal from "sweetalert2";

export const confirmAlert = (title?: string) => {
    return Swal.fire({
        title: title || `¿Está seguro de que desea confirmar los cambios?`,
        showDenyButton: true,
        confirmButtonText: `Confirmar`,
        denyButtonText: `Cancelar`,
        width: 'auto',
        reverseButtons: true,
    });
}

export const confirmAlertDeleteUsuario = (title?: string) => {
    return Swal.fire({
        title: title || `¿Está seguro de que desea confirmar los cambios? <br> <p style="color: red;">Advertencia: Si elimina el usuario se eliminarán también<br> sus datos asociados (vuelos y análisis).</p>`,
        showDenyButton: true,
        confirmButtonText: `Confirmar`,
        denyButtonText: `Cancelar`,
        width: 'auto',
        reverseButtons: true,
    });
}

export const confirmAlertDelete = (title?: string) => {
    return Swal.fire({
        title: title || `¿Está seguro de que desea confirmar los cambios?`,
        showDenyButton: true,
        confirmButtonText: `Confirmar`,
        denyButtonText: `Cancelar`,
        width: 'auto',
        reverseButtons: true,
    });
}

export const successAlert = (title: string) => {
    return Swal.fire({
        title: title,
        icon: 'success',
        showConfirmButton: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        width: 'auto',
        timer: 3000,
    });
}

export const cancelAlert = () => {
    return Swal.fire({
        title: `¿Está seguro de que desea cancelar?`,
        text: 'Los cambios no guardados se perderán',
        showDenyButton: true,
        width: 'auto',
        confirmButtonText: `Confirmar`,
        denyButtonText: `Cancelar`,
        reverseButtons: true,
    });
}

export const loadingAlert = (title: string) => {
    return Swal.fire({
        title: title,
        allowEnterKey: false,
        allowEscapeKey: false,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading()
        }
    });
}

export const warningAlert = (title: string) => {
    return Swal.fire({
        icon: 'warning',
        title: title,
        confirmButtonText: 'Ok',
    });
}

export const errorAlert = (title: string, msg?: string) => {
    return Swal.fire({
        icon: 'error',
        title,
        text: (msg) ? msg : '',
        confirmButtonText: 'Ok',
    });
}
