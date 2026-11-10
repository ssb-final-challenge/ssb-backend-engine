const response = (schema: object, description = "Success", example?: object) => ({
  description,
  content: { "application/json": { schema, ...(example ? { example } : {}) } }
});

const success = { type: "object", properties: { success: { type: "boolean", example: true }, message: { type: "string", example: "Success" }, data: {} } };
const error = { type: "object", properties: { success: { type: "boolean", example: false }, error: { type: "object", properties: { code: { type: "string", example: "REQUEST_FAILED" }, message: { type: "string", example: "Invalid request" } } } } };
const bearer = [{ bearerAuth: [] }];
const auth = { type: "string", example: "Bearer eyJhbGciOiJIUzI1NiIs..." };

export const openapi = {
  openapi: "3.0.3",
  info: { title: "SSB Inspection API", version: "1.0.0", description: "Remote coffee quality inspection API for sellers and buyers." },
  servers: [{ url: "/api/v1", description: "Current API host" }],
  tags: [{ name: "Auth" }, { name: "Inspections" }, { name: "LiveKit" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      User: { type: "object", properties: { id: { type: "integer", example: 1 }, name: { type: "string", example: "Gayo Seller" }, email: { type: "string", format: "email", example: "seller@example.com" }, role: { type: "string", enum: ["farmer", "seller", "buyer"], example: "farmer" } } },
      AuthResponse: { allOf: [success, { properties: { data: { type: "object", properties: { user: { $ref: "#/components/schemas/User" }, accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." } } } } }] },
      Lot: { type: "object", properties: { id: { type: "integer", example: 1 }, lotCode: { type: "string", example: "LOT-GAYO-001" }, name: { type: "string", example: "Gayo Arabica" }, variety: { type: "string", example: "Arabica" }, origin: { type: "string", example: "Aceh Gayo" }, quantityKg: { type: "number", format: "double", example: 250 } } },
      Detection: { type: "object", required: ["label", "confidence", "x", "y", "width", "height"], properties: { label: { type: "string", example: "insect_damage" }, confidence: { type: "number", example: 0.92 }, x: { type: "number", example: 0.25 }, y: { type: "number", example: 0.3 }, width: { type: "number", example: 0.1 }, height: { type: "number", example: 0.12 } } },
      Inspection: { type: "object", properties: { id: { type: "integer", example: 1 }, sampleNumber: { type: "integer", example: 1 }, layer: { type: "string", example: "top" }, imageUrl: { type: "string", format: "uri", example: "https://cdn.example.com/sample.jpg" }, qualityScore: { type: "number", example: 86.5 }, detections: { type: "array", items: { $ref: "#/components/schemas/Detection" } } } },
      Room: { type: "object", properties: { id: { type: "integer", example: 1 }, roomCode: { type: "string", example: "room-mwacb7lc" }, status: { type: "string", enum: ["scheduled", "active", "completed"], example: "active" }, coffeeLotId: { type: "integer", example: 1 } } }
    }
  },
  paths: {
    "/auth/register": { post: { tags: ["Auth"], summary: "Register a user", requestBody: { required: true, content: { "application/json": { example: { name: "Gayo Seller", email: "seller@example.com", password: "password123", role: "farmer" } } } }, responses: { 201: response({ $ref: "#/components/schemas/AuthResponse" }, "Registered", { success: true, message: "Registration successful", data: { user: { id: 1, name: "Gayo Seller", email: "seller@example.com", role: "farmer" }, accessToken: "jwt-token" } }), 400: response(error, "Registration failed") } } },
    "/auth/login": { post: { tags: ["Auth"], summary: "Login", requestBody: { required: true, content: { "application/json": { example: { email: "seller@example.com", password: "password123" } } } }, responses: { 200: response({ $ref: "#/components/schemas/AuthResponse" }, "Logged in"), 401: response(error, "Invalid credentials") } } },
    "/inspections/lots": { get: { tags: ["Inspections"], security: bearer, summary: "List coffee lots", responses: { 200: response(success) } }, post: { tags: ["Inspections"], security: bearer, summary: "Create a coffee lot", requestBody: { required: true, content: { "application/json": { example: { lotCode: "LOT-GAYO-001", name: "Gayo Arabica", variety: "Arabica", origin: "Aceh Gayo", quantityKg: 250 } } } }, responses: { 201: response(success, "Lot created"), 400: response(error) } } },
    "/inspections/lots/{id}": { get: { tags: ["Inspections"], security: bearer, summary: "Get a coffee lot", parameters: [{ $ref: "#/components/parameters/id" }], responses: { 200: response(success), 404: response(error, "Not found") } } },
    "/inspections/rooms": { post: { tags: ["Inspections"], security: bearer, summary: "Create an inspection room", requestBody: { required: true, content: { "application/json": { example: { coffeeLotId: 1, role: "seller" } } } }, responses: { 201: response(success, "Room created"), 400: response(error) } } },
    "/inspections/rooms/{roomCode}": { get: { tags: ["Inspections"], security: bearer, summary: "Retrieve an inspection room", parameters: [{ $ref: "#/components/parameters/roomCode" }], responses: { 200: response(success), 404: response(error, "Not found") } } },
    "/inspections/rooms/{roomCode}/join": { post: { tags: ["Inspections"], security: bearer, summary: "Join an inspection room", parameters: [{ $ref: "#/components/parameters/roomCode" }], requestBody: { content: { "application/json": { example: { role: "buyer" } } } }, responses: { 200: response(success, "Joined room") } } },
    "/inspections/rooms/{roomCode}/requests": { post: { tags: ["Inspections"], security: bearer, summary: "Request another inspection capture", parameters: [{ $ref: "#/components/parameters/roomCode" }], requestBody: { required: true, content: { "application/json": { example: { requestType: "rescan", message: "Please inspect the other side." } } } }, responses: { 201: response(success, "Request created") } } },
    "/inspections/rooms/{roomCode}/inspections": { post: { tags: ["Inspections"], security: bearer, summary: "Store an inspection result", parameters: [{ $ref: "#/components/parameters/roomCode" }], requestBody: { required: true, content: { "application/json": { example: { sampleNumber: 1, layer: "top", imageUrl: "https://cdn.example.com/sample.jpg", modelVersion: "coffee-model-1", qualityScore: 86.5, healthyPercent: 86.5, damagedPercent: 8.5, insectDamagePercent: 5, confidencePercent: 92, detections: [{ label: "insect_damage", confidence: 0.92, x: 0.25, y: 0.3, width: 0.1, height: 0.12 }] } } } }, responses: { 201: response(success, "Inspection created") } } },
    "/inspections/history": { get: { tags: ["Inspections"], security: bearer, summary: "Retrieve inspection history", parameters: [{ name: "roomCode", in: "query", schema: { type: "string", example: "room-mwacb7lc" }, description: "Filter by inspection room code" }, { name: "coffeeLotId", in: "query", schema: { type: "integer", example: 1 }, description: "Filter by coffee lot" }, { name: "capturedBy", in: "query", schema: { type: "integer", example: 1 }, description: "Filter by capturing user" }, { name: "sampleNumber", in: "query", schema: { type: "integer", example: 1 }, description: "Filter by sample number" }, { name: "from", in: "query", schema: { type: "string", format: "date-time", example: "2026-11-10T00:00:00Z" }, description: "Created at or after" }, { name: "to", in: "query", schema: { type: "string", format: "date-time", example: "2026-11-10T23:59:59Z" }, description: "Created at or before" }], responses: { 200: response(success), 400: response(error, "Invalid filter") } } },
    "/inspections/history/{id}": { get: { tags: ["Inspections"], security: bearer, summary: "Retrieve one inspection", parameters: [{ $ref: "#/components/parameters/id" }], responses: { 200: response(success), 404: response(error, "Not found") } } },
    "/inspections/rooms/{roomCode}/reports": { post: { tags: ["Inspections"], security: bearer, summary: "Create an inspection report", parameters: [{ $ref: "#/components/parameters/roomCode" }], requestBody: { required: true, content: { "application/json": { example: { finalQualityScore: 86.5, summary: "Good quality sample with minor insect damage.", pdfUrl: "https://cdn.example.com/report.pdf" } } } }, responses: { 201: response(success, "Report created") } } },
    "/inspections/livekit/token": { post: { tags: ["LiveKit"], security: bearer, summary: "Create a LiveKit participant token", requestBody: { required: true, content: { "application/json": { example: { roomName: "room-mwacb7lc" } } } }, responses: { 200: response(success, "Token created", { success: true, message: "Success", data: { serverUrl: "wss://project.livekit.cloud", participantToken: "livekit-jwt", roomName: "room-mwacb7lc", role: "farmer" } }) } } }
  }
} as any;

(openapi as any).components.parameters = {
  id: { name: "id", in: "path", required: true, schema: { type: "integer", example: 1 } },
  roomCode: { name: "roomCode", in: "path", required: true, schema: { type: "string", example: "room-mwacb7lc" } }
};
