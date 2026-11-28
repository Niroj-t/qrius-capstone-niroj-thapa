import type { APIResponse } from '@playwright/test';
import { test, expect, json } from '../fixtures/api';
import type { ApplicationListResponse } from '../fixtures/types';

test.describe('Security - authorization', () => {
  test('TC_SEC_06 roles cannot use endpoints meant for other roles', async ({ api }) => {
    const job = await api.createJob();
    const seeker = await api.registerUser('jobseeker');
    const application = await api.apply(job.id, seeker.token);
    const statusBody = { is_active: false };

    const forbiddenCalls: Array<[string, () => Promise<APIResponse>]> = [
      ['job seeker creates a job', () => api.post('/jobs', { token: seeker.token, data: { title: 'x' } })],
      ['job seeker deletes a job', () => api.del(`/jobs/${job.id}`, { token: seeker.token })],
      ['job seeker lists users', () => api.get('/users', { token: seeker.token })],
      [
        'job seeker deactivates a user',
        () => api.put(`/users/${seeker.id}/status`, { token: seeker.token, data: statusBody }),
      ],
      [
        'job seeker changes an application status',
        () => api.put(`/applications/${application.id}`, { token: seeker.token, data: { status: 'hired' } }),
      ],
      ['employer lists users', () => api.get('/users', { role: 'employer' })],
      [
        'employer deactivates a user',
        () => api.put(`/users/${seeker.id}/status`, { role: 'employer', data: statusBody }),
      ],
      ['employer applies for a job', () => api.post('/applications', { role: 'employer', data: { job_id: job.id } })],
    ];
    for (const [label, call] of forbiddenCalls) {
      expect.soft((await call()).status(), label).toBe(403);
    }
  });

  test('TC_SEC_07 users cannot read or change another user data', async ({ api }) => {
    const job = await api.createJob();
    const owner = await api.registerUser('jobseeker');
    const stranger = await api.registerUser('jobseeker');
    const application = await api.apply(job.id, owner.token);
    const strangerJob = await api.createJob();
    await api.apply(strangerJob.id, stranger.token);

    const deleteByOther = await api.del(`/jobs/${job.id}`, { role: 'employer2' });
    expect.soft(deleteByOther.status(), 'other employer deletes the job').toBe(403);

    const statusByOther = await api.put(`/applications/${application.id}`, {
      role: 'employer2',
      data: { status: 'rejected' },
    });
    expect.soft(statusByOther.status(), 'other employer changes the application status').toBe(403);

    const strangerList = await json<ApplicationListResponse>(await api.get('/applications', { token: stranger.token }));
    expect
      .soft(
        strangerList.applications?.map((a) => a.id),
        'job seeker sees only own applications',
      )
      .not.toContain(application.id);

    const otherEmployerList = await json<ApplicationListResponse>(
      await api.get('/applications', { role: 'employer2' }),
    );
    expect
      .soft(
        otherEmployerList.applications?.map((a) => a.id),
        'employer sees only own job applications',
      )
      .not.toContain(application.id);
  });
});
