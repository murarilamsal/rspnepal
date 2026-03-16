import { useState } from "react";

const contributorHighlights = [
    {
        id: "rsp-core",
        name: "RSP NEPAL",
        attraction: "Core commitments",
        points: [
            'Integrity and Governance: Ending the "License Raj" and party-based exploitation of state resources.',
            "Economic Growth: Maintaining a 7% average annual growth rate to reach a $3000 per capita income and a $100 billion economy within 5-7 years.",
            "Employment: Creating 1.2 million new jobs in IT, tourism, agriculture, and manufacturing to end forced migration.",
            'Infrastructure: Developing 15,000 MW of electricity, 30,000 km of national highways, and 10 "Signature Projects".',
        ],
    },
];

function mapTopicToContributor(topic) {
    return {
        id: `topic-${topic.id}`,
        name: topic.user_name,
        attraction: topic.user_id === "ADMIN-MURARI" ? "Admin | Reform blueprint" : "User submitted topics",
        points: topic.points,
    };
}

export function HighlightsPanel({ highlights, userEntries, userTopics, currentUser, onCreateUserTopic }) {
    const [selectedContributorId, setSelectedContributorId] = useState("");
    const [activeContributor, setActiveContributor] = useState(null);
    const [isTopicsFormOpen, setIsTopicsFormOpen] = useState(false);
    const [formValues, setFormValues] = useState({ userLookup: "", topics: "" });
    const [topicsAccessMessage, setTopicsAccessMessage] = useState("");

    const contributors = [...contributorHighlights, ...userTopics.map(mapTopicToContributor)];
    const hasLoggedInUser = Boolean(currentUser);

    function handleContributorChange(event) {
        const { value } = event.target;
        setSelectedContributorId(value);

        const selectedContributor = contributors.find((item) => item.id === value) || null;
        setActiveContributor(selectedContributor);
    }

    function handleFormChange(event) {
        const { name, value } = event.target;
        setFormValues((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleTopicsButtonClick() {
        if (!hasLoggedInUser) {
            setTopicsAccessMessage("Please login first from the User login button on the left side.");
            setIsTopicsFormOpen(false);
            return;
        }

        setTopicsAccessMessage("");
        setIsTopicsFormOpen((current) => !current);
    }

    function handleTopicsSubmit(event) {
        event.preventDefault();

        if (!formValues.topics.trim()) {
            return;
        }

        onCreateUserTopic({
            topics_text: formValues.topics.trim(),
        })
            .then((createdTopic) => {
                const newContributor = mapTopicToContributor(createdTopic);
                setSelectedContributorId(newContributor.id);
                setActiveContributor(newContributor);
                setFormValues({ userLookup: "", topics: "" });
                setTopicsAccessMessage("");
                setIsTopicsFormOpen(false);
            })
            .catch((error) => {
                console.error(error);
                setTopicsAccessMessage(error.message || "Please login first from the User login button on the left side.");
            });
    }

    function closeModal() {
        setActiveContributor(null);
    }

    return (
        <>
            <aside className="panel highlights-panel">
                <div className="panel-copy">
                    <span className="eyebrow">Daily Highlight & Responsibility </span>
                    <h2>Contributor Views</h2>
                    <div className="highlight-slogan">
                        <p className="highlight-slogan-nepali">
                            "नागरिकको रूपमा, देशका लागि तपाईंले के गर्न सक्नुहुन्छ भनेर आफैलाई
                            सोध्नुहोस् र त्यसमा काम गर्नुहोस्। यदि धेरै पटक असफल हुनुभयो भने,
                            सरकारले तपाईंलाई कसरी सहयोग गर्न सक्छ भनेर सोध्नुहोस्।"
                        </p>
                        <p className="highlight-slogan-english">
                            "As a citizen, ask yourself what you can do for the country and work
                            on it as your best. If you fail multiple times, ask government how they can help
                            you."
                        </p>
                    </div>
                </div>
                <div className="contributor-picker">
                    <label className="contributor-picker-label">
                        <select
                            value={selectedContributorId}
                            onChange={handleContributorChange}
                            aria-label="Select user or topic"
                            className="contributor-picker-select"
                        >
                            <option value="" disabled>
                                Select user or topic
                            </option>
                            {contributors.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name} - {item.attraction}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button type="button" className="add-topics-button" onClick={handleTopicsButtonClick}>
                        Make Exciting User's Topics
                    </button>
                    {topicsAccessMessage ? <p className="topics-access-message">{topicsAccessMessage}</p> : null}
                </div>
            </aside>

            {isTopicsFormOpen ? (
                <div className="modal-backdrop" onClick={() => setIsTopicsFormOpen(false)} role="presentation">
                    <div
                        className="modal-card modal-card-narrow"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="topics-modal-title"
                    >
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">User's Topics</span>
                                <h2 id="topics-modal-title">Create topic entry</h2>
                                <p>Add your topic lines for the right-side dropdown.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setIsTopicsFormOpen(false)}>
                                Close
                            </button>
                        </div>

                        <form className="user-topics-form" onSubmit={handleTopicsSubmit}>
                            <p className="entry-status">Logged in as {currentUser?.name || "Unknown user"}.</p>

                            <label>
                                Topics
                                <textarea
                                    name="topics"
                                    rows="6"
                                    value={formValues.topics}
                                    onChange={handleFormChange}
                                    placeholder="Enter one topic per line"
                                    required
                                />
                            </label>

                            <button type="submit">Submit topics</button>
                        </form>
                    </div>
                </div>
            ) : null}

            {activeContributor ? (
                <div className="modal-backdrop" onClick={closeModal} role="presentation">
                    <div
                        className="modal-card"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="contributor-modal-title"
                    >
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">Detailed Popup</span>
                                <h2 id="contributor-modal-title">{activeContributor.name}</h2>
                                <p>{activeContributor.attraction}</p>
                            </div>
                            <button type="button" className="modal-close" onClick={closeModal}>
                                Close
                            </button>
                        </div>

                        <ol className="modal-list">
                            {activeContributor.points.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ol>
                    </div>
                </div>
            ) : null}
        </>
    );
}