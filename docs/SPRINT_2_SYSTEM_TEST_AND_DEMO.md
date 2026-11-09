# Sprint 2 - End-to-End System Testing and Demo Preparation

## 1. Objective

The objective of end-to-end testing is to verify that the major features of the Smart Complaint Management System work together correctly, from complaint registration to administrator review and complaint management.

## 2. System Testing Scenarios

### Test Case 1: Complaint Registration

1. Log in as a student.
2. Navigate to the complaint registration page.
3. Enter the complaint subject, description, and category.
4. Submit the complaint.

Expected Result:

* The complaint should be registered successfully.
* The complaint should receive a unique ID.
* An automatic priority should be assigned.

### Test Case 2: Automatic Priority Classification

1. Register complaints with different levels of urgency.
2. Observe the assigned priority.

Expected Result:

* Emergency-related complaints should receive critical priority.
* Urgent complaints should receive high priority.
* Moderate complaints should receive medium priority.
* Ordinary complaints should receive low priority.

### Test Case 3: Admin Priority Override

1. Log in as an administrator.
2. Open a complaint.
3. Change its priority using the priority control.
4. Save the change.

Expected Result:

* The updated priority should be displayed.
* The priority change should be recorded in the audit history.
* Unauthorized users should not be allowed to change priority.

### Test Case 4: Duplicate Complaint Detection

1. Register a complaint describing an existing issue.
2. Open the complaint details.

Expected Result:

* The system should identify a possible duplicate.
* The existing complaint should be linked for review.
* Both complaint records should remain separate.

### Test Case 5: Duplicate Complaint Review

1. Log in as an administrator.
2. Open a complaint identified as a possible duplicate.
3. Review the linked complaint.
4. Mark it as confirmed duplicate or not duplicate.

Expected Result:

* The review status should be updated.
* The administrator and review time should be recorded.
* Neither complaint should be deleted or automatically merged.

### Test Case 6: Search and Filtering

1. Open the administrator complaints page.
2. Search using a complaint ID or keyword.
3. Apply category, status, and priority filters.
4. Apply multiple filters together.

Expected Result:

* Matching complaints should be displayed.
* Unmatched complaints should not appear.
* Multiple filters should work together correctly.

## 3. Integration Testing

The following integrations should be verified:

| Component              | Integration to Verify              |
| ---------------------- | ---------------------------------- |
| Complaint Registration | Priority classification            |
| Complaint Registration | Duplicate detection                |
| Complaint Service      | Local storage persistence          |
| Priority Override      | Audit history                      |
| Duplicate Review       | Complaint update history           |
| Admin Complaints Page  | Search and filtering               |
| Complaint Detail Page  | Priority and duplicate information |

## 4. Test Result Recording

Record the outcome of each test using the following statuses:

* PASS: The test produced the expected result.
* FAIL: The test did not produce the expected result.
* NOT TESTED: The test has not been executed.

| Test Scenario           | Result     | Remarks |
| ----------------------- | ---------- | ------- |
| Complaint Registration  | Not Tested |         |
| Priority Classification | Not Tested |         |
| Admin Priority Override | Not Tested |         |
| Duplicate Detection     | Not Tested |         |
| Duplicate Review        | Not Tested |         |
| Search and Filtering    | Not Tested |         |
| Data Persistence        | Not Tested |         |

## 5. Demo Preparation

The final demonstration should follow this sequence:

1. Introduce the Smart Complaint Management System and its purpose.
2. Demonstrate student login.
3. Register a new complaint.
4. Show the automatically assigned priority.
5. Register a similar complaint to demonstrate duplicate detection.
6. Log in as an administrator.
7. Display the complaints and possible duplicate information.
8. Override a complaint's priority.
9. Review a possible duplicate.
10. Demonstrate complaint search and filtering.
11. Explain the unit tests and testing approach.

## 6. Expected Outcomes

* Complaints can be registered successfully.
* Priority classification assigns an appropriate priority.
* Administrators can override complaint priorities.
* Similar complaints can be identified.
* Administrators can review possible duplicates.
* Original complaint records remain separate.
* Search and filtering return relevant results.
* Important administrative actions are recorded.

## 7. Conclusion

End-to-end testing verifies that the Sprint 2 features work together as part of the Smart Complaint Management System. The final demonstration should highlight automatic priority classification, administrator priority override, duplicate detection, duplicate review, and efficient complaint search and filtering.
