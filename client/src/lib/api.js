export async function api(path, options = {}) {
    const res = await fetch(`/api${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    })
    let data = null
    try {
        data = await res.json()
    } catch {
        data = null
    }
    if (!res.ok) {
        throw new Error((data && data.error) || 'Something went wrong. Please try again.')
    }
    return data
}

export function formatPKR(amount) {
    return `PKR ${new Intl.NumberFormat('en-US').format(Math.round(amount))}`
}