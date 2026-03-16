import { useState } from "react";

function buildTopicOption(topic) {
    const firstPoint = topic.points[0] || "Topic";
    return {
        value: String(topic.id),
        label: `${topic.user_name} - ${firstPoint}`,
    };
}

export function OpinionFeed({ currentUser, userTopics, feedbackItems, onCreateFeedback }) {
    const [selectedTopicId, setSelectedTopicId] = useState("");
    const [feedbackText, setFeedbackText] = useState("");
    const [postingMode, setPostingMode] = useState("anonymous");
    const [feedbackStatus, setFeedbackStatus] = useState("");
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    const topicOptions = userTopics.map(buildTopicOption);

    async function handleSubmit(event) {
        event.preventDefault();
        if (!selectedTopicId || !feedbackText.trim()) {
            return;
        }

        try {
            setFeedbackStatus("");
            await onCreateFeedback({
                user_topic_id: Number(selectedTopicId),
                feedback_text: feedbackText.trim(),
                use_logged_in_identity: postingMode === "authenticated",
            });
            setFeedbackText("");
            setFeedbackStatus("Feedback saved.");
        } catch (error) {
            console.error(error);
            setFeedbackStatus(error.message || "Unable to save feedback.");
        }
    }

    return (
        <>
            <section className="panel feed-panel">
                <div className="panel-copy">
                    <span className="eyebrow">Community Feed</span>
                </div>

                <form className="feedback-chat-form" onSubmit={handleSubmit}>
                    <label>
                        User's Topics
                        <select value={selectedTopicId} onChange={(event) => setSelectedTopicId(event.target.value)} required>
                            <option value="">Select a topic</option>
                            {topicOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Post as
                        <select
                            value={postingMode}
                            onChange={(event) => setPostingMode(event.target.value)}
                        >
                            <option value="anonymous">Visitor without login</option>
                            {currentUser ? <option value="authenticated">Logged in user</option> : null}
                        </select>
                    </label>

                    <label>
                        Feedback
                        <textarea
                            rows="5"
                            value={feedbackText}
                            onChange={(event) => setFeedbackText(event.target.value)}
                            placeholder="Write your opinion or feedback here"
                            required
                        />
                    </label>

                    {feedbackStatus ? <p className="entry-status">{feedbackStatus}</p> : null}

                    <div className="feedback-actions">
                        <button type="submit" disabled={!topicOptions.length}>Send feedback</button>
                        <button type="button" className="feedback-view-button" onClick={() => setIsFeedbackOpen(true)}>
                            Show Feedback
                        </button>
                    </div>
                </form>

                {!topicOptions.length ? (
                    <p className="feedback-helper-text">No topics are available yet. Add a topic from the right-side contributor panel first.</p>
                ) : null}
            </section>

            {isFeedbackOpen ? (
                <div className="modal-backdrop" onClick={() => setIsFeedbackOpen(false)} role="presentation">
                    <div
                        className="modal-card modal-card-narrow feedback-modal-card"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="feedback-modal-title"
                    >
                        <div className="modal-header feedback-modal-header">
                            <div>
                                <span className="eyebrow">Community Feed</span>
                                <h2 id="feedback-modal-title">Feedback</h2>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setIsFeedbackOpen(false)}>
                                Close
                            </button>
                        </div>

                        <div className="feed-list feedback-list feedback-modal-list">
                            {feedbackItems.length === 0 ? (
                                <p className="feedback-empty-state">Feedback will appear here after submission.</p>
                            ) : (
                                feedbackItems.map((feedback) => (
                                    <article className="feed-card feedback-card" key={feedback.id}>
                                        <div className="feed-card-header">
                                            <div>
                                                <h3>{feedback.topic_label}</h3>
                                                <p>{feedback.user_name ? `${feedback.user_name} • ${feedback.user_email}` : "Anonymous visitor"}</p>
                                            </div>
                                            <time dateTime={feedback.created_at}>
                                                {new Date(feedback.created_at).toLocaleString()}
                                            </time>
                                        </div>

                                        <p>{feedback.feedback_text}</p>
                                    </article>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}