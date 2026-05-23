//User Types

export type UserRole = 'contributor' | 'maintainer';

export interface UserPayload {
  id: number;
  name: string;
  role: UserRole;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

//Auth Body Types

export interface SignupBody {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginBody {
  email: string;
  password: string;
}

//Issue Types

export type IssueType = 'bug' | 'feature_request';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface IssueRecord {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface ReporterInfo {
  id: number;
  name: string;
  role: UserRole;
}

export interface IssueWithReporter extends Omit<IssueRecord, 'reporter_id'> {
  reporter: ReporterInfo | null;
}

export interface CreateIssueBody {
  title: string;
  description: string;
  type: IssueType;
}

export interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: IssueType;
}

export interface IssueQueryParams {
  sort?: 'newest' | 'oldest';
  type?: IssueType;
  status?: IssueStatus;
}



declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
