import { Queue, Worker } from 'bullmq';
import { redis } from './redis';

export interface IngestJobData {
  cik: string;
  ticker: string;
  force?: boolean;
}

export const ingestQueue = new Queue('ingest', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const addIngestJob = async (data: IngestJobData) => {
  return await ingestQueue.add('ingest-company-data', data, {
    jobId: `ingest-${data.cik}`,
    delay: 0,
  });
};

export const getJobStatus = async (jobId: string) => {
  const job = await ingestQueue.getJob(jobId);
  if (!job) return null;
  
  return {
    id: job.id,
    progress: job.progress,
    state: await job.getState(),
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  };
};