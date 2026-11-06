import 'server-only';
import type { Language } from '@/lib/config';
import { FEEDBACK_SYSTEM_PROMPT, buildFeedbackUserMessage } from './feedback';
import { SUMMARY_SYSTEM_PROMPT, buildSummaryUserMessage } from './summary';
import { JOBPOST_SYSTEM_PROMPT, jobpostUserMessage } from './jobpost';
import { FEEDBACK_PROMPT_VERSION, SUMMARY_PROMPT_VERSION, JOBPOST_PROMPT_VERSION } from './version';
import { FEEDBACK_SYSTEM_PROMPT_TR, buildFeedbackUserMessageTr } from './tr/feedback';
import { SUMMARY_SYSTEM_PROMPT_TR, buildSummaryUserMessageTr } from './tr/summary';
import { JOBPOST_SYSTEM_PROMPT_TR, jobpostUserMessageTr } from './tr/jobpost';
import {
  FEEDBACK_TR_PROMPT_VERSION,
  SUMMARY_TR_PROMPT_VERSION,
  JOBPOST_TR_PROMPT_VERSION,
} from './tr/version';
export function feedbackPrompt(language: Language = 'en') {
  return language === 'tr'
    ? {
        system: FEEDBACK_SYSTEM_PROMPT_TR,
        build: buildFeedbackUserMessageTr,
        version: FEEDBACK_TR_PROMPT_VERSION,
        schemaName: 'interview_feedback_tr',
      }
    : {
        system: FEEDBACK_SYSTEM_PROMPT,
        build: buildFeedbackUserMessage,
        version: FEEDBACK_PROMPT_VERSION,
        schemaName: 'interview_feedback',
      };
}
export function summaryPrompt(language: Language = 'en') {
  return language === 'tr'
    ? {
        system: SUMMARY_SYSTEM_PROMPT_TR,
        build: buildSummaryUserMessageTr,
        version: SUMMARY_TR_PROMPT_VERSION,
        schemaName: 'interview_summary_tr',
      }
    : {
        system: SUMMARY_SYSTEM_PROMPT,
        build: buildSummaryUserMessage,
        version: SUMMARY_PROMPT_VERSION,
        schemaName: 'interview_summary',
      };
}
export function jobpostPrompt(language: Language = 'en') {
  return language === 'tr'
    ? {
        system: JOBPOST_SYSTEM_PROMPT_TR,
        build: jobpostUserMessageTr,
        version: JOBPOST_TR_PROMPT_VERSION,
        schemaName: 'jobpost_questions_tr',
      }
    : {
        system: JOBPOST_SYSTEM_PROMPT,
        build: jobpostUserMessage,
        version: JOBPOST_PROMPT_VERSION,
        schemaName: 'jobpost_questions',
      };
}
