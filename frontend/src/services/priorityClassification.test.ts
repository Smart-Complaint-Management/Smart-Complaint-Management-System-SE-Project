import { describe, expect, it } from 'vitest';
import { classifyComplaintPriority } from './complaintService';

describe('complaint priority classification accuracy', () => {
const testCases = [
{
name: 'classifies emergency situations as critical',
subject: 'Campus emergency',
description: 'There is an immediate danger in the building.',
category: 'it_infrastructure',
expected: 'critical',
},
{
name: 'classifies fire incidents as critical',
subject: 'Fire reported',
description: 'There is a fire near the laboratory.',
category: 'it_infrastructure',
expected: 'critical',
},
{
name: 'classifies electric shock incidents as critical',
subject: 'Electrical safety issue',
description: 'A student experienced an electric shock.',
category: 'it_infrastructure',
expected: 'critical',
},
{
name: 'classifies urgent complaints as high',
subject: 'Urgent maintenance request',
description: 'The classroom equipment needs attention.',
category: 'it_infrastructure',
expected: 'high',
},
{
name: 'classifies harassment complaints as high',
subject: 'Student harassment',
description: 'A student reported repeated harassment.',
category: 'harassment',
expected: 'high',
},
{
name: 'classifies power outages as high',
subject: 'Power outage',
description: 'The power supply is unavailable in the laboratory.',
category: 'it_infrastructure',
expected: 'high',
},
{
name: 'classifies server failures as high',
subject: 'Server down',
description: 'The campus server is not available.',
category: 'it_infrastructure',
expected: 'high',
},
{
name: 'classifies repeated delays as medium',
subject: 'Repeated service delay',
description: 'The maintenance request is frequently delayed.',
category: 'it_infrastructure',
expected: 'medium',
},
{
name: 'classifies intermittent issues as medium',
subject: 'Intermittent Wi-Fi',
description: 'The network has an intermittent malfunction.',
category: 'it_infrastructure',
expected: 'medium',
},
{
name: 'classifies ordinary requests as low',
subject: 'Request for classroom equipment',
description: 'Please provide an additional whiteboard.',
category: 'it_infrastructure',
expected: 'low',
},
{
name: 'classifies general feedback as low',
subject: 'Campus suggestion',
description: 'It would be helpful to add more seating.',
category: 'it_infrastructure',
expected: 'low',
},
{
name: 'prioritizes critical incidents over high keywords',
subject: 'Urgent fire emergency',
description: 'Immediate danger has been reported.',
category: 'it_infrastructure',
expected: 'critical',
},
] as const;

it.each(testCases)(
'$name',
({ subject, description, category, expected }) => {
const result = classifyComplaintPriority(
subject,
description,
category,
);

```
  expect(result).toBe(expected);
},
```

);

it('calculates the classification accuracy for the test dataset', () => {
const correctPredictions = testCases.filter((testCase) => {
const predicted = classifyComplaintPriority(
testCase.subject,
testCase.description,
testCase.category,
);

```
  return predicted === testCase.expected;
}).length;

const accuracy =
  (correctPredictions / testCases.length) * 100;

expect(accuracy).toBeGreaterThanOrEqual(90);
```

});
});
