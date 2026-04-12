class AdminPortal {
    constructor() {
        this.adminEmail = 'tan_seng_kwang@moe.edu.sg';
        this.membersUnsubscribe = null;
    }

    async init() {
        this.setupEventListeners();
<<<<<<< HEAD
=======
        this.setupCSVUpload();
>>>>>>> 64ea449 (Fix calendar slot alignment and add test for 8am event row)
        FirebaseService.onAuthStateChanged((user) => this.onAuthStateChanged(user));
    }

    setupEventListeners() {
        const signInBtn = document.getElementById('googleSignInBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const addMemberBtn = document.getElementById('addMemberBtn');
        const memberEmailInput = document.getElementById('memberEmailInput');

        signInBtn.addEventListener('click', async () => {
            try {
                await FirebaseService.signInWithGoogle();
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        });

        logoutBtn.addEventListener('click', async () => {
            try {
                await FirebaseService.logout();
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        });

        addMemberBtn.addEventListener('click', () => this.handleAddMember());
        memberEmailInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleAddMember();
            }
        });
    }

    async onAuthStateChanged(user) {
        const authSection = document.getElementById('authSection');
        const mainSection = document.getElementById('mainSection');
        const logoutBtn = document.getElementById('logoutBtn');
        const userEmail = document.getElementById('userEmail');

        if (!user) {
            if (this.membersUnsubscribe) {
                this.membersUnsubscribe();
                this.membersUnsubscribe = null;
            }
            authSection.style.display = 'flex';
            mainSection.style.display = 'none';
            logoutBtn.style.display = 'none';
            userEmail.textContent = '';
            return;
        }

        const normalizedEmail = FirebaseService.normalizeEmail(user.email);
        if (normalizedEmail !== this.adminEmail) {
            this.showToast('Admin access only.', 'error');
            await FirebaseService.logout();
            return;
        }

        try {
            await FirebaseService.ensureAdminProfile();
        } catch (error) {
            this.showToast('Please update Firestore rules for admin profile write.', 'warning');
        }

        authSection.style.display = 'none';
        mainSection.style.display = 'block';
        logoutBtn.style.display = 'inline-block';
        userEmail.textContent = normalizedEmail;

        this.membersUnsubscribe = FirebaseService.watchMembers((members) => {
            this.renderMembersList(members);
        });
    }

    async handleAddMember() {
        const emailInput = document.getElementById('memberEmailInput');
        const email = (emailInput.value || '').trim().toLowerCase();

        if (!email) {
            this.showToast('Please enter a member email.', 'error');
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            this.showToast('Please enter a valid email.', 'error');
            return;
        }

        try {
            await FirebaseService.addMemberByEmail(email);
            emailInput.value = '';
            this.showToast('Member added.', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleRemoveMember(memberId, memberEmail) {
        if (!confirm('Remove this member?')) return;

        try {
            await FirebaseService.removeMember(memberId, memberEmail);
            this.showToast('Member removed.', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    renderMembersList(members) {
        const container = document.getElementById('membersList');
        if (!members || members.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No members added yet.</p></div>';
            return;
        }

        container.innerHTML = '';
        members.forEach((member) => {
            const item = document.createElement('div');
            item.className = 'member-item';

            const left = document.createElement('div');
            left.innerHTML = `
                <div class="member-email">${this.escapeHtml(member.email || '')}</div>
                <div class="member-meta">Added by ${this.escapeHtml(member.addedBy || this.adminEmail)}</div>
            `;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-danger btn-sm';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => this.handleRemoveMember(member.id, member.email || ''));

            item.appendChild(left);
            item.appendChild(removeBtn);
            container.appendChild(item);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), duration);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const portal = new AdminPortal();
    portal.init();
});