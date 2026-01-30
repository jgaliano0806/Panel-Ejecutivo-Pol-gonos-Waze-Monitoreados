import { FastifyInstance } from "fastify";
import { riskScoringService } from "../services/riskScoringService";
import { predictiveRiskService } from "../services/PredictiveRiskService";
import { incidentTriageService } from "../services/IncidentTriageService";
import { getAllGroups } from "../config/realPolygons";

export default async function riskRoutes(fastify: FastifyInstance) {
  // GET /api/risk/summary
  fastify.get("/summary", async (request, reply) => {
    try {
      const summaries = await riskScoringService.getGroupRiskSummaries();
      return {
        summaries,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get risk summary" });
    }
  });

  // GET /api/risk/scores
  // Query param optional: ?group=Name
  fastify.get("/scores", async (request, reply) => {
    try {
      const { group } = request.query as { group?: string };
      const scores = await riskScoringService.getRiskScoresByGroup(group);
      return {
        scores,
        group: group || "all",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get risk scores" });
    }
  });

  // GET /api/risk/groups
  fastify.get("/groups", async (request, reply) => {
    try {
      const groups = getAllGroups();
      return { groups };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get risk groups" });
    }
  });

  // GET /api/risk/polygon/:id
  fastify.get("/polygon/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const score = await riskScoringService.getPolygonRiskScore(id);
      if (!score) {
        return reply.code(404).send({ error: "Polygon score not found" });
      }
      return score;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get polygon score" });
    }
  });

  // POST /api/risk/calculate
  // Trigger manual calculation
  fastify.post("/calculate", async (request, reply) => {
    try {
      await riskScoringService.calculateAllRiskScores();
      return { success: true, message: "Risk scores calculation started" };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to calculate risk scores" });
    }
  });

  // POST /api/risk/polygon/:id/recalculate
  fastify.post("/polygon/:id/recalculate", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await riskScoringService.calculatePolygonRiskScore(id);
      return { success: true, message: `Recalculated score for polygon ${id}` };
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to recalculate polygon score" });
    }
  });

  // =====================================================
  // PREDICTIVE INTELLIGENCE ENDPOINTS
  // =====================================================

  // GET /api/risk/predictions
  // Obtiene predicciones de riesgo para todos los polígonos
  fastify.get("/predictions", async (request, reply) => {
    try {
      const predictions = await predictiveRiskService.predictAllPolygons();
      return {
        predictions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to get risk predictions" });
    }
  });

  // GET /api/risk/predictions/:id
  // Obtiene predicción de riesgo para un polígono específico
  fastify.get("/predictions/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const prediction = await predictiveRiskService.predictPolygonRisk(id);
      return prediction;
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Failed to get polygon prediction" });
    }
  });

  // GET /api/risk/triage/classify
  // Clasifica un incidente basado en tipo, subtipo y reliability
  fastify.get("/triage/classify", async (request, reply) => {
    try {
      const { type, subtype, reliability } = request.query as {
        type: string;
        subtype?: string;
        reliability?: string;
      };

      if (!type) {
        return reply.code(400).send({ error: "Type is required" });
      }

      const classification = incidentTriageService.classifyIncident(
        type,
        subtype || "",
        parseFloat(reliability || "5"),
      );

      return {
        type,
        subtype,
        ...classification,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to classify incident" });
    }
  });

  // POST /api/risk/triage/train
  // Entrena/actualiza el modelo de clasificación
  fastify.post("/triage/train", async (request, reply) => {
    try {
      await incidentTriageService.trainClassificationModel();
      return {
        success: true,
        message: "Classification model training started",
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to train triage model" });
    }
  });
}
