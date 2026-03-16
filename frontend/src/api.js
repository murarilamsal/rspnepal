export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

const AUTH_SESSION_STORAGE_KEY = "rsp-auth-session";

export function getStoredAuthSession() {
    const storedSession = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    return storedSession ? JSON.parse(storedSession) : null;
}

export function saveAuthSession(authSession) {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(authSession));
}

export function clearAuthSession() {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

function getAuthHeaders() {
    const authSession = getStoredAuthSession();
    return authSession?.token
        ? { Authorization: `Bearer ${authSession.token}` }
        : {};
}

async function buildApiError(response, defaultMessage) {
    try {
        const errorPayload = await response.json();
        return new Error(errorPayload?.detail || defaultMessage);
    } catch {
        return new Error(defaultMessage);
    }
}

export async function fetchHighlights() {
    const response = await fetch(`${API_BASE_URL}/api/highlights`);
    if (!response.ok) {
        throw new Error("Unable to load highlights");
    }
    return response.json();
}

export async function fetchOpinions() {
    const response = await fetch(`${API_BASE_URL}/api/opinions`);
    if (!response.ok) {
        throw new Error("Unable to load opinions");
    }
    return response.json();
}

export async function createOpinion(formValues) {
    const body = new FormData();
    Object.entries(formValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            body.append(key, value);
        }
    });

    const response = await fetch(`${API_BASE_URL}/api/opinions`, {
        method: "POST",
        body,
    });

    if (!response.ok) {
        throw new Error("Unable to submit opinion");
    }

    return response.json();
}

export async function addReaction(opinionId, reactionType) {
    const response = await fetch(`${API_BASE_URL}/api/opinions/${opinionId}/reactions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction_type: reactionType }),
    });

    if (!response.ok) {
        throw new Error("Unable to save reaction");
    }

    return response.json();
}

export async function createUserEntry(formValues) {
    const response = await fetch(`${API_BASE_URL}/api/user-entries`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
    });

    if (!response.ok) {
        throw await buildApiError(response, "Unable to save user entry");
    }

    return response.json();
}

export async function loginUser(formValues) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
    });

    if (!response.ok) {
        throw await buildApiError(response, "Unable to login");
    }

    return response.json();
}

export async function activateUser(formValues) {
    const response = await fetch(`${API_BASE_URL}/api/auth/activate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
    });

    if (!response.ok) {
        throw await buildApiError(response, "Unable to activate account");
    }

    return response.json();
}

export async function fetchUserEntries() {
    const response = await fetch(`${API_BASE_URL}/api/user-entries`);
    if (!response.ok) {
        throw new Error("Unable to load user entries");
    }

    return response.json();
}

export async function fetchUserTopics() {
    const response = await fetch(`${API_BASE_URL}/api/user-topics`);
    if (!response.ok) {
        throw new Error("Unable to load user topics");
    }

    return response.json();
}

export async function createUserTopic(formValues) {
    const response = await fetch(`${API_BASE_URL}/api/user-topics`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(formValues),
    });

    if (!response.ok) {
        throw await buildApiError(response, "Unable to save user topics");
    }

    return response.json();
}

export async function updateUserTopic(topicId, formValues) {
    const response = await fetch(`${API_BASE_URL}/api/user-topics/${topicId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(formValues),
    });

    if (!response.ok) {
        throw await buildApiError(response, "Unable to update user topics");
    }

    return response.json();
}

export async function deleteUserTopic(topicId) {
    const response = await fetch(`${API_BASE_URL}/api/user-topics/${topicId}`, {
        method: "DELETE",
        headers: {
            ...getAuthHeaders(),
        },
    });

    if (!response.ok) {
        throw await buildApiError(response, "Unable to delete user topics");
    }

    return response.json();
}

export async function fetchFeedbacks() {
    const response = await fetch(`${API_BASE_URL}/api/feedbacks`);
    if (!response.ok) {
        throw new Error("Unable to load feedback");
    }

    return response.json();
}

export async function createFeedback(formValues) {
    const response = await fetch(`${API_BASE_URL}/api/feedbacks`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify(formValues),
    });

    if (!response.ok) {
        throw await buildApiError(response, "Unable to submit feedback");
    }

    return response.json();
}