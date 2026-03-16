import { useEffect, useState } from "react";

import {
    createFeedback,
    createUserTopic,
    deleteUserTopic,
    fetchFeedbacks,
    fetchHighlights,
    fetchUserEntries,
    fetchUserTopics,
    getStoredAuthSession,
    saveAuthSession,
    updateUserTopic,
} from "./api";
import { HighlightsPanel } from "./components/HighlightsPanel";
import { OpinionFeed } from "./components/OpinionFeed";
import { OpinionForm } from "./components/OpinionForm";

export default function App() {
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [highlights, setHighlights] = useState({ title: "", items: [] });
    const [userEntries, setUserEntries] = useState([]);
    const [userTopics, setUserTopics] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => getStoredAuthSession()?.user || null);

    useEffect(() => {
        async function loadData() {
            const [feedbackData, highlightsData, userEntriesData, userTopicsData] = await Promise.all([
                fetchFeedbacks(),
                fetchHighlights(),
                fetchUserEntries(),
                fetchUserTopics(),
            ]);

            setFeedbackItems(feedbackData);
            setHighlights(highlightsData);
            setUserEntries(userEntriesData);
            setUserTopics(userTopicsData);
        }

        loadData().catch((error) => {
            console.error(error);
        });
    }, []);

    async function handleCreateFeedback(payload) {
        const createdFeedback = await createFeedback(payload);
        setFeedbackItems((current) => [createdFeedback, ...current]);
        return createdFeedback;
    }

    function handleUserEntryCreated(authSession) {
        setUserEntries((current) => [...current, authSession.user].sort((left, right) => left.name.localeCompare(right.name)));
        saveAuthSession(authSession);
        setCurrentUser(authSession.user);
    }

    function handleUserAuthenticated(authSession) {
        saveAuthSession(authSession);
        setCurrentUser(authSession.user);
    }

    async function handleCreateUserTopic(payload) {
        const createdTopic = await createUserTopic(payload);
        setUserTopics((current) => [createdTopic, ...current]);
        return createdTopic;
    }

    async function handleUpdateUserTopic(topicId, payload) {
        const updatedTopic = await updateUserTopic(topicId, payload);
        setUserTopics((current) => current.map((topic) => (topic.id === topicId ? updatedTopic : topic)));
        return updatedTopic;
    }

    async function handleDeleteUserTopic(topicId) {
        await deleteUserTopic(topicId);
        setUserTopics((current) => current.filter((topic) => topic.id !== topicId));
    }

    return (
        <div className="app-shell">
            <header className="hero">
                <div className="hero-copy">
                    <span className="eyebrow hero-eyebrow">RSPNepal.online</span>
                    <h1>
                        𝘜𝘯𝘧𝘪𝘭𝘵𝘦𝘳𝘦𝘥 𝘤𝘰𝘮𝘮𝘶𝘯𝘪𝘵𝘺 𝘪𝘥𝘦𝘢𝘴, 𝘱𝘶𝘣𝘭𝘪𝘤 𝘢𝘤𝘤𝘰𝘶𝘯𝘵𝘢𝘣𝘪𝘭𝘪𝘵𝘺, 𝘢𝘯𝘥 𝘳𝘦𝘢𝘭 𝘱𝘢𝘳𝘵𝘪𝘤𝘪𝘱𝘢𝘵𝘪𝘰𝘯. 𝘗𝘶𝘣𝘭𝘪𝘤 𝘪𝘯𝘵𝘦𝘳𝘢𝘤𝘵𝘪𝘰𝘯 𝘱𝘰𝘳𝘵𝘢𝘭 𝘧𝘰𝘳 𝘴𝘶𝘨𝘨𝘦𝘴𝘵𝘪𝘰𝘯𝘴, 𝘱𝘰𝘭𝘪𝘤𝘺 𝘪𝘥𝘦𝘢𝘴, 𝘢𝘯𝘥 𝘥𝘰𝘤𝘶𝘮𝘦𝘯𝘵𝘦𝘥 𝘱𝘳𝘰𝘱𝘰𝘴𝘢𝘭𝘴 𝘧𝘳𝘰𝘮 𝘤𝘪𝘵𝘪𝘻𝘦𝘯𝘴 𝘢𝘵 𝘩𝘰𝘮𝘦 𝘢𝘯𝘥 𝘢𝘣𝘳𝘰𝘢𝘥.
                    </h1>
                    <h2 className="hero-subnote">
                        (यो फोरमले नेपालभित्र र विदेशमा रहेका समर्थकहरूबाट विचार, कागजात, र व्यावहारिक
                        सहयोगका लागि सुझाव संकलन गर्दछ।)
                    </h2>
                    <h1 className="hero-note">
                        (It&apos;s not official RSP Nepal online forum it&apos;s everyday people & open resources forum)
                    </h1>
                </div>
            </header>

            <main className="content-grid">
                <section className="content-stack">
                    <OpinionForm
                        userEntries={userEntries}
                        userTopics={userTopics}
                        currentUser={currentUser}
                        onUserEntryCreated={handleUserEntryCreated}
                        onUserAuthenticated={handleUserAuthenticated}
                        onUpdateUserTopic={handleUpdateUserTopic}
                        onDeleteUserTopic={handleDeleteUserTopic}
                    />
                    <OpinionFeed
                        currentUser={currentUser}
                        userTopics={userTopics}
                        feedbackItems={feedbackItems}
                        onCreateFeedback={handleCreateFeedback}
                    />
                </section>
                <HighlightsPanel
                    highlights={highlights}
                    userEntries={userEntries}
                    userTopics={userTopics}
                    currentUser={currentUser}
                    onCreateUserTopic={handleCreateUserTopic}
                />
            </main>
        </div>
    );
}