# MeasureSquare Cloud API Integration Notes

This document summarizes how to connect FLoCon to the MeasureSquare Cloud API and preserves the vendor guidance you shared.

## Environment Variables

Set these in `.env.local` or your deployment environment:

- `MEASURE_SQUARE_API_URL` = `https://cloud.measuresquare.com/api`
- `MEASURE_SQUARE_HEADER_STYLE` = `basic` (per Cloud API docs)
- `MEASURE_SQUARE_API_KEY` = Your API key (used as Basic auth username)
- `MEASURE_SQUARE_X_APPLICATION` = Provided by MeasureSquare (pending)
- `MEASURE_SQUARE_SECRET_KEY` = Provided by MeasureSquare (pending)

Our client signs the required headers each request:

- `Authorization: Basic <base64(apiKey)>`
- `X-Application: <your app>`
- `X-Timestamp: <current unix seconds>`
- `X-Signature: base64( HMAC-SHA256( timestamp, secretKey ) )`

## Test Script

Run a quick connectivity check:

```
npm run test:msq -- /projects
```

The script auto-populates the X-headers and Basic auth when env vars exist.

Convenience test:

```
npm run test:msq:count
```

## Node/TS Example (using our client)

```ts
import getMSQ from '@/src/lib/measureSquareClient';

const msq = getMSQ();
const { ok, status, data } = await msq.request('/projects/count');
if (!ok) throw new Error(`MSQ error: ${status}`);
console.log(data);
```

---

# Vendor Document (Preserved)

## Sample Code (from vendor)

PHP, Java, C#, and CURL examples demonstrate:

- Basic auth with the API key as username (some examples append `:`; if required, set `MEASURE_SQUARE_BASIC_INCLUDE_COLON=true`).
- Required X-headers: `X-Application`, `X-Timestamp`, `X-Signature` where signature = base64(HMAC-SHA256(timestamp, secret)).

The repository test script and client implement this behavior.

## Introduction

Welcome to use MeasureSquare cloud APIs.
The Cloud API is organized around REST, has predictable, resource-oriented URLs.

Before use, you need to contact the admin, request an auth name and token key to generate the required authentication string.
For more detail, see Authentication section.

The Cloud API support JSON and XML data format, and uses HTTP response codes to indicate API errors.
For more detail, see Response and Errors section.

## Product catalog APIs

| API                                 | Description                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| GET `api/productdbs/{id}/products`  | Get products from product catalog                                                                                                            |
| POST `api/productdbs/{id}/products` | Create/Update/Delete the products in product catalog. It is allowed to only pass the attribute values of the product that need to be updated |

Notes:

1. The default value of MatchKeyField is ID, which can be set to VendorSKU. If set to VendorSKU, the product's VendorSKU needs to be passed as a non empty string.
2. The default value of OverWrite is false. If you want to clear all existing old product datas in the product catalog, set it to true.
3. Update_Keep_Existing is best to set it to true, so it will keep the estimation values which may be updated in M8. otherwise, the product will be updated with default estimation value if you do not transfer estimation properties.
4. The default value of Update_Del_Existing is false. If you want to delete the existing products that are not in the passed updated product list, set it to true.

DELETE `api/productdbs/{id}/products` — Delete some products in product catalog

GET `api/productdbs?m2Id={m2Id}` — Get the user's product catalogs

POST `api/productdbs?m2Id={m2Id}&name={name}` — Create empty product catalog

DELETE `api/productdbs?id={id}&m2Id={m2Id}` — Delete the whole product catalog

## Project APIs

- GET `api/{m2Id}/projects?search={search}&isArchived={isArchived}&applicationType={applicationType}&showTags={showTags}` — Get the projects by MeasureSquare ID. The return projects are sorted by last updated date. Max return count is 100.
- GET `api/{m2Id}/projects/count?search={search}&isArchived={isArchived}&applicationType={applicationType}` — Get the project count by MeasureSquare ID
- GET `api/{m2Id}/projects/length/{pageLength}/page/{pageIndex}?search={search}&orderby={orderby}&isArchived={isArchived}&applicationType={applicationType}&showTags={showTags}` — Get the paging projects by MeasureSquare ID.
- GET `api/{m2Id}/projects/date/{updatedTime}/number/{number}?isArchived={isArchived}&applicationType={applicationType}&showTags={showTags}` — Get the new/updated projects based on time stamp by MeasureSquare ID. It is the best way that you remember the LastUpdatedOn value of the last project, and pass this value while invoking this API next time, to prevent from missing projects.
- GET `api/projects/count?search={search}&distinct={distinct}&isArchived={isArchived}&applicationType={applicationType}` — Get total project count in group
- GET `api/projects/length/{pageLength}/page/{pageIndex}?search={search}&distinct={distinct}&orderby={orderby}&isArchived={isArchived}&applicationType={applicationType}` — Get paging projects in group
- GET `api/projects/date/{updatedTime}/number/{number}?isArchived={isArchived}&applicationType={applicationType}` — Get the new/updated projects based on time stamp. It is the best way that you remember the LastUpdatedOn value of the last project, and pass this value while invoking this API next time, to prevent from missing projects.
- GET `api/projects/{projectId}/accessToken?readOnly={readOnly}` — Get project access token
- GET `api/projects/{projectId}?getProductInfo={getProductInfo}` — Get project info, include Customer Info/Job Site Contact and Address/Management/Project products
- GET `api/projects/{projectId}/layers` — Get layer info, include Rooms(Wall/Window/Door/Elevation) and Stairs
- GET `api/projects/{projectId}/layerAssignment?showRoomDetails={showRoomDetails}` — Get product assignment info of each Room and Stair
- GET `api/projects/{projectId}/worksheets` — Get project worksheets
- GET `api/projects/{projectId}/estimation?withCutImage={withCutImage}` — Get project estimation
- GET `api/projects/{projectId}/report?sections={sections}` — Get project report
- GET `api/projects/{projectId}/download?revision={revision}` — Get project file (application/fez)
- GET `api/projects/{projectId}/images?width={width}&height={height}` — Get a zip file include all layer images (application/zip)
- GET `api/projects/{projectId}/layers/{layerIndex}/image?width={width}&height={height}&showDimensions={showDimensions}&showUnderlays={showUnderlays}` — Get layer image (image/png)
- GET `api/projects/{projectId}/pdf?printProfileId={printProfileId}` — Get project pdf (application/pdf)
- GET `api/projects/{projectId}/fsde` — Get project fsde file (text/xml)
- GET `api/projects/{projectId}/dxf` — Get project dxf file (application/dxf)
- GET `api/projects/{projectId}/webviewer?showQty={showQty}&showAreaPerimeter={showAreaPerimeter}&showDimensions={showDimensions}&showBluePrint={showBluePrint}&showEmptyTakeoff={showEmptyTakeoff}&show3D={show3D}` — Get project viewer url
- GET `api/projects/{projectId}/sharedusers` — Get project shared users list
- GET `api/projects/{projectId}/url?revision={revision}` — Get project file url
- POST `api/{m2Id}/projects` — Create or update project for MeasureSquare ID
- POST `api/{m2Id}/projects/{projectId}/clone` — Clone one project from designated project
- POST `api/{m2Id}/projects/{projectId}/archive` — Archive project
- POST `api/{m2Id}/projects/{projectId}/unarchive` — Unarchive project

## Stone Project APIs

- POST `api/{m2Id}/stoneProjects` — Create or update project for MeasureSquare ID
- GET `api/{m2Id}/stoneProjects?Search={Search}&IsArchived={IsArchived}&ShowTags={ShowTags}&Orderby={Orderby}&PageIndex={PageIndex}&PageSize={PageSize}` — Get the stone projects by MeasureSquare ID
- GET `api/stoneProjects/{projectId}?getProductInfo={getProductInfo}` — Get stone project info, inclue Customer Info/Job Site Contact and Address/Management/Project products
- GET `api/stoneProjects/{projectId}/estimation` — Get project estimation
- GET `api/stoneProjects/{projectId}/worksheet` — Get project worksheet
- GET `api/stoneProjects/{projectId}/slabOptimizerPDF?slabName={slabName}` — Get the stone project Slab Optimizer PDF
- GET `api/stoneProjects/{projectId}/dryLayPDF?slabName={slabName}` — Get the stone project Dry Lay PDF

## Authentication

You authenticate to the MeasureSquare cloud API by providing your API Key in the request.
You can manage your API Key from your account's API Setting page.
Your API keys carry many privileges, so be sure to keep them secret!

Authentication to the API occurs via HTTP Basic Auth. Provide your API Key as the basic auth username. You do not need to provide a password.
You must authenticate for all requests.
For example:

```
curl -u PutYourApiKeyHere: --request GET "https://cloud.measuresquare.com/api/projects/count"
```

## X-Headers

X-header parameters are required when calling the API. Contact Measure Square at integration@measuresquare.com to receive both the X-Application and secret key for your application.
The three required parameters are listed below, along with descriptions. Please be aware that they should be provided in your HTTP request header.

- `X-Application`: String associated with your application
- `X-Timestamp`: Current Unix timestamp
- `X-Signature`: Unique signature generated by using both the secret key and timestamp string to generate a HMAC-SHA256 signature. This must be base 64-encoded.

All API requests must be made over HTTPS. Calls made over HTTP will fail, and the API requests without authentication will also fail.
API Endpoint: `https://cloud.measuresquare.com`

## Response and Errors

The Cloud API support JSON and XML data format.
If set the Request Accept to `application/json`, the API will return the data with JSON format.
If set the Request Accept to `application/xml`, the API will return the data with XML format.

The Cloud API uses conventional HTTP status codes to indicate the success or failure of an API request.

- 200 success status code, and request data.
- 401 if the authentication failed.
- 400 (or 404) if the request data does not exist.
- 500 for unknown exceptions (rare).

If request failure (non 200 status code), response will also return the defined error message in response content.

## Notification

Notification URL is an optional setting.
If you need the project notification, register your URL in API Setting page.
MeasureSquare cloud will notify anytime a project be created or updated, and one parameter called `projectId` will be attached to your registered URL.
