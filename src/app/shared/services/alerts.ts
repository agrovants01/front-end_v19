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
        timer: 2000,
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

export const duplicadosAlert = (usuarios: any[], titulo?: string, isEdit?: boolean) => {
    const items = usuarios
        .map((u) => {
            const nombre = [u.nombreUsuario, u.apellidoUsuario].filter(Boolean).join(' ') || u.aliasUsuario;
            const perfil = u.perfil || '';
            return `<li><strong>${nombre}</strong>${perfil ? ` <em>(${perfil})</em>` : ''}${u.aliasUsuario && nombre !== u.aliasUsuario ? ` — alias: ${u.aliasUsuario}` : ''}</li>`;
        })
        .join('');

    return Swal.fire({
        icon: 'warning',
        title: titulo || 'Se han detectado usuarios parecidos',
        html: `
            <div style="text-align:left; font-size:14px;">
                <p>Se detectaron los siguientes usuarios similares al que está intentando ${isEdit ? 'editar' : 'crear'}:</p>
                <ul style="margin-left:20px;">${items}</ul>
                <p style="margin-top:12px; font-weight:bold;">¿Está seguro de no ${isEdit ? 'editar' : 'crear'} un duplicado?</p>
            </div>
        `,
        showDenyButton: true,
        confirmButtonText: isEdit ? 'Guardar edición' : 'Crear igual',
        denyButtonText: 'Cancelar',
        reverseButtons: true,
        width: 'auto',
    });
}
