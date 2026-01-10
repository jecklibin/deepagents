/**
 * Main application initialization for DeepAgents Web
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    const chatManager = new ChatManager();
    const skillsManager = new SkillsManager();

    // Connect WebSocket
    chatManager.connect();

    // Load skills
    skillsManager.loadSkills();

    // Tab navigation
    const navTabs = document.querySelectorAll('.nav-tab');
    const panels = document.querySelectorAll('.panel');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update active tab
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show target panel
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(`${targetTab}-panel`).classList.add('active');

            // Refresh skills when switching to skills tab
            if (targetTab === 'skills') {
                skillsManager.loadSkills();
            }
        });
    });
});
