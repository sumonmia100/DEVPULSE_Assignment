import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import {
  IssueRecord,
  IssueWithReporter,
  ReporterInfo,
  CreateIssueBody,
  UpdateIssueBody,
  IssueQueryParams,
  IssueType,
  IssueStatus,
} from '../../types';

const VALID_TYPES: IssueType[] = ['bug', 'feature_request'];
const VALID_STATUSES: IssueStatus[] = ['open', 'in_progress', 'resolved'];



const attachReporters = async (issues: IssueRecord[]): Promise<IssueWithReporter[]> => {
  if (issues.length === 0) return [];

  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];

  const reportersResult = await pool.query<ReporterInfo>(
    'SELECT id, name, role FROM users WHERE id = ANY($1)',
    [reporterIds]
  );

  const reporterMap: Record<number, ReporterInfo> = {};
  reportersResult.rows.forEach((reporter) => {
    reporterMap[reporter.id] = reporter;
  });

  return issues.map(({ reporter_id, ...rest }) => ({
    ...rest,
    reporter: reporterMap[reporter_id] ?? null,
  }));
};

//CREATE ISSUE 

export const createIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, type }: CreateIssueBody = req.body;

    if (!title || !description || !type) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Title, description, and type are required.');
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length > 150) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Title must not exceed 150 characters.');
      return;
    }

    if (trimmedDescription.length < 20) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Description must be at least 20 characters.');
      return;
    }

    if (!VALID_TYPES.includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Type must be bug or feature_request.');
      return;
    }

    const reporter_id = req.user!.id;

    const result = await pool.query<IssueRecord>(
      'INSERT INTO issues (title, description, type, reporter_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [trimmedTitle, trimmedDescription, type, reporter_id]
    );

    sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', result.rows[0]);
  } catch (error) {
    sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error while creating issue.', error);
  }
};

//GET ALL ISSUES

export const getAllIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sort, type, status }: IssueQueryParams = req.query as IssueQueryParams;

    // Validate sort param
    if (sort && sort !== 'newest' && sort !== 'oldest') {
      sendError(res, StatusCodes.BAD_REQUEST, 'Sort must be newest or oldest.');
      return;
    }

    let query = 'SELECT * FROM issues';
    const params: string[] = [];
    const conditions: string[] = [];

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        sendError(res, StatusCodes.BAD_REQUEST, 'Invalid type filter.');
        return;
      }
      params.push(type);
      conditions.push('type = $' + params.length);
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        sendError(res, StatusCodes.BAD_REQUEST, 'Invalid status filter.');
        return;
      }
      params.push(status);
      conditions.push('status = $' + params.length);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += sort === 'oldest' ? ' ORDER BY created_at ASC' : ' ORDER BY created_at DESC';

    const issuesResult = await pool.query<IssueRecord>(query, params);
    const issuesWithReporters = await attachReporters(issuesResult.rows);

    sendSuccess(res, StatusCodes.OK, 'Issues retrived successfully', issuesWithReporters);
  } catch (error) {
    sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error while fetching issues.', error);
  }
};

// GET SINGLE ISSUE

export const getIssueById = async (req: Request, res: Response): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id);

    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID.');
      return;
    }

    const result = await pool.query<IssueRecord>(
      'SELECT * FROM issues WHERE id = $1',
      [issueId]
    );

    if (result.rows.length === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    const [issueWithReporter] = await attachReporters(result.rows);

    sendSuccess(res, StatusCodes.OK, 'Issue retrived successfully', issueWithReporter);
  } catch (error) {
    sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error while fetching issue.', error);
  }
};

//UPDATE ISSUE

export const updateIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id);

    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID.');
      return;
    }

    const { title, description, type }: UpdateIssueBody = req.body;
    const currentUser = req.user!;

    const issueResult = await pool.query<IssueRecord>(
      'SELECT * FROM issues WHERE id = $1',
      [issueId]
    );

    if (issueResult.rows.length === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    const issue = issueResult.rows[0];

    if (currentUser.role === 'contributor') {
      if (issue.reporter_id !== currentUser.id) {
        sendError(res, StatusCodes.FORBIDDEN, 'You can only update your own issues.');
        return;
      }

      if (issue.status !== 'open') {
        sendError(res, StatusCodes.CONFLICT, 'You can only update issues with open status.');
        return;
      }
    }

    if (title !== undefined && title.length > 150) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Title must not exceed 150 characters.');
      return;
    }

    if (description !== undefined && description.length < 20) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Description must be at least 20 characters.');
      return;
    }

    if (type !== undefined && !VALID_TYPES.includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Type must be bug or feature_request.');
      return;
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (title !== undefined) {
      params.push(title);
      updates.push('title = $' + params.length);
    }

    if (description !== undefined) {
      params.push(description);
      updates.push('description = $' + params.length);
    }

    if (type !== undefined) {
      params.push(type);
      updates.push('type = $' + params.length);
    }

    if (updates.length === 0) {
      sendError(res, StatusCodes.BAD_REQUEST, 'No valid fields provided for update.');
      return;
    }

    params.push(issueId);

    const updateResult = await pool.query<IssueRecord>(
      'UPDATE issues SET ' + updates.join(', ') + ' WHERE id = $' + params.length + ' RETURNING *',
      params
    );

    sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', updateResult.rows[0]);
  } catch (error) {
    sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error while updating issue.', error);
  }
};

//DELETE ISSUE 
export const deleteIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const issueId = parseInt(req.params.id);

    if (isNaN(issueId)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Invalid issue ID.');
      return;
    }

    const result = await pool.query<IssueRecord>(
      'SELECT id FROM issues WHERE id = $1',
      [issueId]
    );

    if (result.rows.length === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    await pool.query('DELETE FROM issues WHERE id = $1', [issueId]);

    sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully', undefined);
  } catch (error) {
    sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error while deleting issue.', error);
  }
};
