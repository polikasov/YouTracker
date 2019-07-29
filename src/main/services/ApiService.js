import urls from '../../common/urls';

class ApiService {
    
    constructor(authService) {
        this.authService = authService;
    }
    
    async getIssues() {
        const response = await this.authService.authorizedFetch(urls.getIssues, {
            headers
        });
        
        return response.ok ? await response.json() : [];
    }
    
    async postWorkItem({ issueId, date, minutes, startTime, endTime }) {
        const response = await this.authService.authorizedFetch(urls.postWorkItems(issueId), {
            headers,
            method: 'POST',
            body: JSON.stringify({
                date,
                duration: { minutes },
                text: workItemText(startTime, endTime)
            })
        });
        
        if (response.status >= 500 && response.status < 600) {
            throw new Error("Server error");
        }
    }
}

const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

const formatTime = (time) => {
    return time.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' });
};

const workItemText = (startTime, endTime) => {
    if (startTime && endTime) {
        return `[${formatTime(startTime)}–${formatTime(endTime)}] YouTracker`;
    }
    return null;
};

export default ApiService;
