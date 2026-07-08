# Data Models

## Tenancy

```mermaid
erDiagram
    Union ||--o{ Division : has
    Division ||--o{ Local : has
    Union ||--o{ Local : has_direct
    Local ||--o{ User : employs
    User }o--o{ Role : has
```

### Union
```typescript
{ id, name, slug, defaultLocale, enabledModules, brandDefaults, createdAt }
```

### Division (optional)
```typescript
{ id, unionId, name, code, enabledModules }
```

### Local
```typescript
{ id, unionId, divisionId?, localNumber, subText, brandKitId }
```

### User
```typescript
{ id, email, name, mfaEnabled, unionId, localId?, roles[] }
```

### UnionConfig
```typescript
{ unionId, grievanceConfig?: CAConfig, retentionYears: number }
```

## Comms

### BrandKit (v2)
```typescript
{
  version: "2.0",
  unionId, unionName, divisionName?,
  local: { id, localNumber, subText },
  primaryColor, secondaryColor, accentColor,
  useOfficialLogo, customLogoDataUrl?,
  updatedAt
}
```

## Grievance

### Grievance
```typescript
{ id, unionId, localId, memberPseudonym?, category, status, currentStep, filedAt, resolvedAt?, assignedStewardId }
```

### GrievanceEvent
```typescript
{ id, grievanceId, type, stepNumber?, dueAt?, completedAt?, note? }
```

### GrievanceNote
```typescript
{ id, grievanceId, authorId, body, createdAt }  // immutable
```

### CAConfig
```typescript
{ unionId, localId?, steps: { number, name, responseDays }[] }
```

## Bumping

### BumpingCase
```typescript
{ id, unionId, localId, memberRef, seniorityDate, currentPosition, scenario, status }
```

### CommitteeSession
```typescript
{ id, bumpingCaseId, date, attendees[], agenda, decisionId? }
```

## Platform

### AuditLog
```typescript
{ id, userId, action, resourceType, resourceId, unionId, localId, timestamp, metadata? }
```

## Notes

- Every query filters by `unionId` minimum
- `localId` required for local-scoped entities
- OPSEU/CAAT v1 code maps to reference seed, not schema defaults
