import { useState } from "react";

import { activateUser, createUserEntry, loginUser } from "../api";

function formatTopicLines(points) {
    return points.join("\n");
}

function isAdminTopic(topic) {
    return topic.user_id === "ADMIN-MURARI";
}

function isCurrentUserAdmin(currentUser) {
    return currentUser?.user_id === "ADMIN-MURARI";
}

function buildTopicPreview(topic) {
    if (isAdminTopic(topic)) {
        return "Logged in";
    }

    const firstPoint = topic.points[0] || "";
    return topic.points.length > 1 ? `${firstPoint} ...` : firstPoint;
}

export function OpinionForm({ userEntries, userTopics, currentUser, onUserEntryCreated, onUserAuthenticated, onUpdateUserTopic, onDeleteUserTopic }) {
    const [isUserEntryOpen, setIsUserEntryOpen] = useState(false);
    const [entryFormValues, setEntryFormValues] = useState({ name: "", email: "", phone: "", password: "" });
    const [loginLookup, setLoginLookup] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [activationValues, setActivationValues] = useState({ userLookup: "", phone: "", password: "" });
    const [loginStatus, setLoginStatus] = useState("");
    const [entryStatus, setEntryStatus] = useState("");
    const [editingTopic, setEditingTopic] = useState(null);
    const [editTopicsText, setEditTopicsText] = useState("");
    const [topicsStatus, setTopicsStatus] = useState("");
    const displayTopics = [...userTopics].sort((left, right) => {
        const leftIsAdmin = isAdminTopic(left);
        const rightIsAdmin = isAdminTopic(right);

        if (leftIsAdmin && !rightIsAdmin) {
            return -1;
        }

        if (!leftIsAdmin && rightIsAdmin) {
            return 1;
        }

        return 0;
    });

    function handleEntryFormChange(event) {
        const { name, value } = event.target;
        setEntryFormValues((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function canManageTopic(topic) {
        if (!currentUser) {
            return false;
        }

        return isCurrentUserAdmin(currentUser) || currentUser.user_id === topic.user_id;
    }

    function handleExistingUserLogin(event) {
        event.preventDefault();
        const normalizedLookup = loginLookup.trim();
        if (!normalizedLookup || !loginPassword) {
            return;
        }

        loginUser({ user_lookup: normalizedLookup, password: loginPassword })
            .then((authSession) => {
                onUserAuthenticated(authSession);
                setLoginLookup("");
                setLoginPassword("");
                setLoginStatus("");
                setIsUserEntryOpen(false);
            })
            .catch((error) => {
                console.error(error);
                setLoginStatus(error.message || "Unable to login.");
            });
    }

    function handleActivationChange(event) {
        const { name, value } = event.target;
        setActivationValues((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleActivateAccount(event) {
        event.preventDefault();
        if (!activationValues.userLookup.trim() || !activationValues.phone.trim() || !activationValues.password) {
            return;
        }

        activateUser({
            user_lookup: activationValues.userLookup.trim(),
            phone: activationValues.phone.trim(),
            password: activationValues.password,
        })
            .then((authSession) => {
                onUserAuthenticated(authSession);
                setActivationValues({ userLookup: "", phone: "", password: "" });
                setLoginStatus("");
                setIsUserEntryOpen(false);
            })
            .catch((error) => {
                console.error(error);
                setLoginStatus(error.message || "Unable to activate account.");
            });
    }

    async function handleEntrySubmit(event) {
        event.preventDefault();
        setEntryStatus("");

        try {
            const authSession = await createUserEntry({
                name: entryFormValues.name.trim(),
                email: entryFormValues.email.trim(),
                phone: entryFormValues.phone.trim(),
                password: entryFormValues.password,
            });
            onUserEntryCreated(authSession);
            setEntryFormValues({ name: "", email: "", phone: "", password: "" });
            setLoginLookup("");
            setLoginPassword("");
            setActivationValues({ userLookup: "", phone: "", password: "" });
            setLoginStatus("");
            setEntryStatus(`User entry saved. User ID: ${authSession.user.user_id}`);
            setIsUserEntryOpen(false);
        } catch (error) {
            console.error(error);
            setEntryStatus(error.message || "Unable to save user entry.");
        }
    }

    function openEditModal(topic) {
        setTopicsStatus("");
        setEditingTopic(topic);
        setEditTopicsText(formatTopicLines(topic.points));
    }

    async function handleTopicUpdate(event) {
        event.preventDefault();
        if (!editingTopic) {
            return;
        }

        try {
            if (!currentUser) {
                setTopicsStatus("Please login first.");
                return;
            }

            await onUpdateUserTopic(editingTopic.id, { topics_text: editTopicsText.trim() });
            setTopicsStatus("Topics updated.");
            setEditingTopic(null);
            setEditTopicsText("");
        } catch (error) {
            console.error(error);
            setTopicsStatus(error.message || "Unable to update topics.");
        }
    }

    async function handleTopicDelete(topicId) {
        try {
            if (!currentUser) {
                setTopicsStatus("Please login first.");
                return;
            }

            await onDeleteUserTopic(topicId);
            setTopicsStatus("Topics deleted.");
        } catch (error) {
            console.error(error);
            setTopicsStatus(error.message || "Unable to delete topics.");
        }
    }

    return (
        <>
            <section className="panel form-panel">
                <div className="panel-copy">
                    <div className="form-panel-header">
                        <h1 className="form-panel-title">Public Interaction</h1>
                        <button type="button" className="left-entry-button" onClick={() => setIsUserEntryOpen(true)}>
                            User login
                        </button>
                        <span className="form-panel-header-spacer" aria-hidden="true"></span>
                    </div>
                    {loginStatus ? <p className="entry-status">{loginStatus}</p> : null}
                    {entryStatus ? <p className="entry-status">{entryStatus}</p> : null}
                    {topicsStatus ? <p className="entry-status">{topicsStatus}</p> : null}
                </div>

                <div className="topics-table-wrap">
                    <table className="topics-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Topics</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayTopics.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="topics-empty-cell">
                                        No saved user topics yet.
                                    </td>
                                </tr>
                            ) : (
                                displayTopics.map((topic) => (
                                    <tr key={topic.id}>
                                        <td className="topics-user-id-cell" title={topic.user_id}>{topic.user_id}</td>
                                        <td className="topics-name-cell" title={topic.user_name}>{topic.user_name}</td>
                                        <td className="topics-email-cell" title={isAdminTopic(topic) ? "Logged in admin" : topic.user_email}>
                                            {isAdminTopic(topic) ? "Logged in admin" : topic.user_email}
                                        </td>
                                        <td>
                                            <div className="topics-preview-cell" title={formatTopicLines(topic.points)}>
                                                {buildTopicPreview(topic)}
                                            </div>
                                        </td>
                                        <td className="topics-actions-cell">
                                            {isAdminTopic(topic) ? (
                                                isCurrentUserAdmin(currentUser) ? (
                                                    <button type="button" onClick={() => openEditModal(topic)}>
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <span className="admin-topic-badge">Admin</span>
                                                )
                                            ) : canManageTopic(topic) ? (
                                                <>
                                                    <button type="button" onClick={() => openEditModal(topic)}>
                                                        Edit
                                                    </button>
                                                    <button type="button" className="danger-button" onClick={() => handleTopicDelete(topic.id)}>
                                                        Delete
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="view-only-badge">View only</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {isUserEntryOpen ? (
                <div className="modal-backdrop" onClick={() => setIsUserEntryOpen(false)} role="presentation">
                    <div
                        className="modal-card modal-card-narrow"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="left-user-entry-modal-title"
                    >
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">User Entry</span>
                                <h2 id="left-user-entry-modal-title">Create user entry</h2>
                                <p>Enter name, email, and phone number only.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setIsUserEntryOpen(false)}>
                                Close
                            </button>
                        </div>

                        <form className="user-topics-form login-lookup-form" onSubmit={handleExistingUserLogin}>
                            <label>
                                Login with User ID or Email
                                <input
                                    value={loginLookup}
                                    onChange={(event) => setLoginLookup(event.target.value)}
                                    placeholder="Enter User ID or email"
                                />
                            </label>

                            <label>
                                Password
                                <input
                                    type="password"
                                    value={loginPassword}
                                    onChange={(event) => setLoginPassword(event.target.value)}
                                    placeholder="Enter password"
                                />
                            </label>

                            <button type="submit">Login existing user</button>
                        </form>

                        <form className="user-topics-form login-lookup-form" onSubmit={handleActivateAccount}>
                            <label>
                                Activate existing account with User ID or Email
                                <input
                                    name="userLookup"
                                    value={activationValues.userLookup}
                                    onChange={handleActivationChange}
                                    placeholder="Enter User ID or email"
                                />
                            </label>

                            <label>
                                Phone
                                <input
                                    name="phone"
                                    value={activationValues.phone}
                                    onChange={handleActivationChange}
                                    placeholder="Enter registered phone number"
                                />
                            </label>

                            <label>
                                New Password
                                <input
                                    name="password"
                                    type="password"
                                    value={activationValues.password}
                                    onChange={handleActivationChange}
                                    placeholder="Set a password"
                                />
                            </label>

                            <button type="submit">Activate account</button>
                        </form>

                        <form className="user-topics-form" onSubmit={handleEntrySubmit}>
                            <label>
                                Full Name
                                <input
                                    name="name"
                                    value={entryFormValues.name}
                                    onChange={handleEntryFormChange}
                                    placeholder="Enter Full name"
                                    required
                                />
                            </label>

                            <label>
                                Email
                                <input
                                    name="email"
                                    type="email"
                                    value={entryFormValues.email}
                                    onChange={handleEntryFormChange}
                                    placeholder="Enter email"
                                    required
                                />
                            </label>

                            <label>
                                Phone
                                <input
                                    name="phone"
                                    value={entryFormValues.phone}
                                    onChange={handleEntryFormChange}
                                    placeholder="Enter phone number"
                                    required
                                />
                            </label>

                            <label>
                                Password
                                <input
                                    name="password"
                                    type="password"
                                    value={entryFormValues.password}
                                    onChange={handleEntryFormChange}
                                    placeholder="Create password"
                                    required
                                />
                            </label>

                            <button type="submit">Submit</button>
                        </form>
                    </div>
                </div>
            ) : null}

            {editingTopic ? (
                <div className="modal-backdrop" onClick={() => setEditingTopic(null)} role="presentation">
                    <div
                        className="modal-card"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-user-topic-modal-title"
                    >
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">Edit Topics</span>
                                <h2 id="edit-user-topic-modal-title">{editingTopic.user_name}</h2>
                                <p>Edit the saved topics for this registered user.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setEditingTopic(null)}>
                                Close
                            </button>
                        </div>

                        <form className="user-topics-form" onSubmit={handleTopicUpdate}>
                            <label>
                                Topics
                                <textarea
                                    value={editTopicsText}
                                    onChange={(event) => setEditTopicsText(event.target.value)}
                                    rows="8"
                                    placeholder="Enter one topic per line"
                                    required
                                />
                            </label>

                            <button type="submit">Update topics</button>
                        </form>
                    </div>
                </div>
            ) : null}
        </>
    );
}