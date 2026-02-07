class NotificationManager {
    static show(message, type = 'info') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 500);
        });

        // Create notification container
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        // Add icon based on type
        const icon = document.createElement('i');
        icon.className = `fas fa-${
            type === 'success' ? 'check-circle' :
            type === 'error' ? 'exclamation-circle' :
            'info-circle'
        }`;
        notification.appendChild(icon);

        // Add message text
        const text = document.createElement('span');
        text.textContent = message;
        notification.appendChild(text);

        // Append to body
        document.body.appendChild(notification);

        // Hover bounce effect
        notification.addEventListener('mouseenter', () => {
            notification.classList.add('bounce');
        });
        notification.addEventListener('mouseleave', () => {
            notification.classList.remove('bounce');
        });

        // Auto-dismiss after 3s
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static info(message) {
        this.show(message, 'info');
    }
}

// Optional: Global shortcut function (for convenience)
window.NotificationManager = NotificationManager;
