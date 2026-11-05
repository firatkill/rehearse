import 'server-only';
import f0 from '@/content/demo/feedback/beh-001.json';
import f1 from '@/content/demo/feedback/beh-002.json';
import f2 from '@/content/demo/feedback/beh-003.json';
import f3 from '@/content/demo/feedback/beh-004.json';
import f4 from '@/content/demo/feedback/beh-005.json';
import f5 from '@/content/demo/feedback/demo-cedar-tools-1.json';
import f6 from '@/content/demo/feedback/demo-cedar-tools-2.json';
import f7 from '@/content/demo/feedback/demo-cedar-tools-3.json';
import f8 from '@/content/demo/feedback/demo-cedar-tools-4.json';
import f9 from '@/content/demo/feedback/demo-cedar-tools-5.json';
import f10 from '@/content/demo/feedback/demo-cedar-tools-6.json';
import f11 from '@/content/demo/feedback/demo-cedar-tools-7.json';
import f12 from '@/content/demo/feedback/demo-cedar-tools-8.json';
import f13 from '@/content/demo/feedback/demo-harbour-health-1.json';
import f14 from '@/content/demo/feedback/demo-harbour-health-2.json';
import f15 from '@/content/demo/feedback/demo-harbour-health-3.json';
import f16 from '@/content/demo/feedback/demo-harbour-health-4.json';
import f17 from '@/content/demo/feedback/demo-harbour-health-5.json';
import f18 from '@/content/demo/feedback/demo-harbour-health-6.json';
import f19 from '@/content/demo/feedback/demo-harbour-health-7.json';
import f20 from '@/content/demo/feedback/demo-harbour-health-8.json';
import f21 from '@/content/demo/feedback/demo-northwind-pay-1.json';
import f22 from '@/content/demo/feedback/demo-northwind-pay-2.json';
import f23 from '@/content/demo/feedback/demo-northwind-pay-3.json';
import f24 from '@/content/demo/feedback/demo-northwind-pay-4.json';
import f25 from '@/content/demo/feedback/demo-northwind-pay-5.json';
import f26 from '@/content/demo/feedback/demo-northwind-pay-6.json';
import f27 from '@/content/demo/feedback/demo-northwind-pay-7.json';
import f28 from '@/content/demo/feedback/demo-northwind-pay-8.json';
import f29 from '@/content/demo/feedback/sdl-001.json';
import f30 from '@/content/demo/feedback/sdl-002.json';
import f31 from '@/content/demo/feedback/sdl-003.json';
import f32 from '@/content/demo/feedback/sdl-004.json';
import f33 from '@/content/demo/feedback/sdl-005.json';
import f34 from '@/content/demo/feedback/tec-001.json';
import f35 from '@/content/demo/feedback/tec-002.json';
import f36 from '@/content/demo/feedback/tec-003.json';
import f37 from '@/content/demo/feedback/tec-004.json';
import f38 from '@/content/demo/feedback/tec-005.json';
import j0 from '@/content/demo/job-posts/cedar-tools.json';
import j1 from '@/content/demo/job-posts/harbour-health.json';
import j2 from '@/content/demo/job-posts/northwind-pay.json';
import { DemoFeedbackSchema, DemoJobSchema } from './schema';
export const demoFeedback = DemoFeedbackSchema.array().parse([
  f0,
  f1,
  f2,
  f3,
  f4,
  f5,
  f6,
  f7,
  f8,
  f9,
  f10,
  f11,
  f12,
  f13,
  f14,
  f15,
  f16,
  f17,
  f18,
  f19,
  f20,
  f21,
  f22,
  f23,
  f24,
  f25,
  f26,
  f27,
  f28,
  f29,
  f30,
  f31,
  f32,
  f33,
  f34,
  f35,
  f36,
  f37,
  f38,
]);
export const demoJobs = DemoJobSchema.array().parse([j0, j1, j2]);
