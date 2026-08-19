import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

const POWER = '#FFD600'

const base = {
    background: '#13131a',
    color: '#e5e5e5',
    confirmButtonColor: POWER,
    confirmButtonText: 'OK',
    cancelButtonColor: '#2a2a35',
    cancelButtonText: 'Cancel',
    iconColor: POWER,
    backdrop: 'rgba(10, 10, 15, 0.8)',
}

export const fireSwal = (opts) => Swal.fire({ ...base, ...opts })

export function swalError(message, title = 'Something went wrong') {
    return fireSwal({
        icon: 'error',
        title,
        text: typeof message === 'string' ? message : 'An unexpected error occurred.',
    })
}

export function swalSuccess(message, title = 'Done!') {
    return fireSwal({
        icon: 'success',
        title,
        text: message || '',
    })
}

export function swalInfo(message, title = 'Heads up') {
    return fireSwal({
        icon: 'info',
        title,
        text: message || '',
    })
}

export function swalWarn(message, title = 'Are you sure?') {
    return fireSwal({
        icon: 'warning',
        title,
        text: message || '',
    })
}

export function confirmSwal(message, title = 'Are you sure?', opts = {}) {
    return fireSwal({
        icon: 'warning',
        title,
        text: message,
        showCancelButton: true,
        confirmButtonText: opts.confirmText || 'Yes, continue',
        cancelButtonText: opts.cancelText || 'Cancel',
        ...opts,
    }).then((result) => result.isConfirmed)
}

// Selection dialog (dropdown) — returns the chosen value or null.
export function swalSelect(options, { title = 'Select an option', text = '', placeholder = 'Choose…', current = '', confirmText = 'Save' } = {}) {
    return fireSwal({
        icon: 'question',
        title,
        text,
        input: 'select',
        inputOptions: options,
        inputValue: current,
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonText: confirmText,
        showLoaderOnConfirm: false,
        inputValidator: (value) => (!value ? 'Please select an option' : undefined),
    }).then((result) => {
        if (result.isConfirmed) return result.value
        return null
    })
}

// Text input dialog with validation — returns the trimmed value or null.
export function swalPrompt(title, { text = '', placeholder = '', inputValue = '', validator, confirmText = 'Save', inputType = 'text' } = {}) {
    return fireSwal({
        icon: 'question',
        title,
        text,
        input: inputType,
        inputValue,
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonText: confirmText,
        inputValidator: (value) => {
            const v = (value ?? '').trim()
            if (!v) return 'This field is required'
            if (validator) return validator(v)
            return undefined
        },
    }).then((result) => {
        if (result.isConfirmed) return String(result.value ?? '').trim()
        return null
    })
}
