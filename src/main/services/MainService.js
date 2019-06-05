import { EventEmitter } from 'events';
import TrackingService from './TrackingService';
import IssueService from './IssueService';
import WorkItemService from './WorkItemService';
import ApiService from './ApiService';
import AuthService from './AuthService';

class MainService extends EventEmitter {

  constructor() {
    super();
    this.authService = new AuthService();
    this.apiService = new ApiService(this.authService);
    this.session = null;
  }

  // Public

  async initialize() {
    this.authService.on('unauthorized', () => {
      this.destroySession();
    });

    await this.authService.initialize();

    if (this.authService.isAuthorized) {
      this.createSession();
    }
  }

  async logIn(login, password) {
    await this.authService.logIn(login, password);
    this.createSession();
  }

  async logOut() {
    await this.authService.logOut();
  }

  startTracking(issueId) {
    if (this.session) {
      this.session.trackingService.start(issueId);
    }
  }
  
  stopTracking() {
    if (this.session) {
      this.session.trackingService.stop();
    }
  }
  
  addWorkItem(item) {
    if (this.session) {
      this.session.trackingService.add(item);
    }
  }

  reloadIssues() {
    if (this.session) {
      this.session.issueService.reload();
    }
  }

  get state() {
    return {
      isAuthorized: this.authService.isAuthorized,
      state: this.session ? {
        issues: this.session.issueService.issues,
        activeIssueId: this.session.trackingService.activeIssueId
      } : null
    };
  }

  // Private

  createSession() {
    if (this.session) return;

    const issueService = new IssueService(this.apiService);
    const workItemService = new WorkItemService(this.apiService);
    const trackingService = new TrackingService(workItemService);

    trackingService.on('changed', () => {
      this.dispatchChanges();
    });
    
    issueService.on('changed', () => {
      this.dispatchChanges();
    });
    
    workItemService.on('all-sent', () => {
      issueService.reload();
    });

    issueService.initialize();
    workItemService.initialize();

    this.session = { issueService, workItemService, trackingService };
    this.dispatchChanges();
  }

  destroySession() {
    if (!this.session) return;

    this.session.issueService.destroy();
    this.session.workItemService.destroy();

    this.session = null;
    this.dispatchChanges();
  }

  dispatchChanges() {
    this.emit('changed');
  }
}

export default MainService;