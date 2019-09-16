import { EventEmitter } from 'events';
import parseIssues from './parseIssues';
import store from './store';

const AUTORELOAD_INTERVAL = 2 * 60 * 1000; // 2 minutes

const DEFAULT_QUERY = 'for: me #Unresolved sort by: created';

class IssueService extends EventEmitter {
    
    constructor(apiService, userId) {
        super();
        
        this.apiService = apiService;
        this.userId = userId;
        
        this._query = DEFAULT_QUERY;
        this._issues = [];
        this.destroyed = false;
    }
    
    // Public
    
    get issues() {
        return this._issues;
    }

    get query() {
        return this._query;
    }
    
    initialize() {
        this.restoreQuery();
        this.restoreIssues();
        this.startTimer();
    }
    
    destroy() {
        this.stopTimer();
        this.destroyed = true;
    }
    
    async reload() {
        try {
            console.log('Loading issues...');
            
            this._issues = parseIssues(
                await this.apiService.getIssues(this.query)
            );
            this.storeIssues();
            
            console.log(`${this._issues.length} issues loaded`);
            this.dispatchChanges();
        } catch (error) {
            console.error('Issues loading error:', error);
        }
    }

    async setQuery(query) {
        try {
            const isValid = await this.apiService.validateIssuesQuery(query);

            if (isValid) {
                this._query = query;
                this.storeQuery();

                console.log('Issues query changed:', query);
                this.dispatchChanges();
            } else {
                throw new Error('Issues query is not valid:', query);
            }

        } catch (error) {
            console.log('Issues query validation error:', error);
            throw error;
        }

        await this.reload();
    }
    
    // Private

    dispatchChanges() {
        this.emit('changed');
    }
    
    async startTimer() {
        await this.reload();
        
        if (this.destroyed) return;
        
        this.timer = setTimeout(async () => {
            this.timer = null;
            await this.startTimer();
        }, AUTORELOAD_INTERVAL);
    }
    
    stopTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
    
    storeIssues() {
        store.set(`issues-${this.userId}`, this._issues);
    }
    
    restoreIssues() {
        const issues = store.get(`issues-${this.userId}`);
        if (issues) {
            this._issues = issues;
            console.log(`${issues.length} issues restored`);
        }
    }

    storeQuery() {
        store.set('issuesQuery', this._query);
    }

    restoreQuery() {
        const query = store.get('issuesQuery');
        if (query) {
            this._query = query;
            console.log(`Issues query restored: ${query}`);
        }
    }
}

export default IssueService;
    