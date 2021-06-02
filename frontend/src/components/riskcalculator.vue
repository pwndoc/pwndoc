<template>
  <q-card>
    <q-card-section class="row">
      <div class="col-md-6">Risk Score</div>
      <q-space />
      <div class="scoreRating" :class="severity">
        <span class="baseSeverity" v-if="!score || score < 0.1"
          >Select values for all base metrics to generate score</span
        >
        <div v-else>
          <span class="baseMetricScore">{{ score }}</span>
          <span class="baseSeverity">({{ severity }})</span>
        </div>
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section class="row q-col-gutter-md">
      <q-select
        label="Impact"
        stack-label
        class="col-md-6"
        v-model="impact"
        :options="[
          { label: 'Insignificant (1)', value: 1 },
          { label: 'Tolerable (2)', value: 2 },
          { label: 'Moderate (3)', value: 3 },
          { label: 'Grave (4)', value: 4 },
          { label: 'Catastrophic (5)', value: 5 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
      />
      <q-select
        label="Probability"
        stack-label
        class="col-md-6"
        v-model="probability"
        :options="[
          { label: 'Very Unlikely (1)', value: 1 },
          { label: 'Unlikely (2)', value: 2 },
          { label: 'Possible (3)', value: 3 },
          { label: 'Likely (4)', value: 4 },
          { label: 'Very Likely (5)', value: 5 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
      />
    </q-card-section>
  </q-card>
</template>

<script>
export default {
  name: "pwndoc-frontend-dev",
  props: ["riskImpact", "riskProbability", "riskScore", "riskSeverity"],
  watch: {
    impact: function(val) {
      this.$emit("riskImpactChange", val);
      this.calculateScore();
    },
    probability: function(val) {
      this.$emit("riskProbabilityChange", val);
      this.calculateScore();
    },
  },

  methods: {
    calculateScore() {
      if (!!this.impact && !!this.probability) {
        const maxScore = 5 ** 2;
        this.score =
          Math.round(((this.impact * this.probability) / maxScore) * 100) / 10;
        this.severity = this.calculateSeverity(this.score);

        this.$emit("riskScoreChange", this.score);
        this.$emit("riskSeverityChange", this.severity);
      }
    },
    calculateSeverity(score) {
      const severityRatings = [
        { name: "None", bottom: 0.0, top: 0.0 },
        { name: "Low", bottom: 0.1, top: 3.9 },
        { name: "Medium", bottom: 4.0, top: 6.9 },
        { name: "High", bottom: 7.0, top: 8.9 },
        { name: "Critical", bottom: 9.0, top: 10.0 },
      ];

      const severityRatingLength = severityRatings.length;

      const validatedScore = Number(score);

      if (isNaN(validatedScore)) {
        return validatedScore;
      }

      for (var i = 0; i < severityRatingLength; i++) {
        if (
          score >= severityRatings[i].bottom &&
          score <= severityRatings[i].top
        ) {
          return severityRatings[i].name;
        }
      }

      return undefined;
    },
  },

  data: function() {
    return {
      impact: this.riskImpact,
      probability: this.riskProbability,
      score: this.riskScore,
      severity: this.riskSeverity,
    };
  },
};
</script>

<style>
.group-btn .q-btn {
  border: 1px solid #ccc;
}

.group-btn .q-btn-inner div {
  font-weight: 400;
}

.baseSeverity {
  font-size: 16px;
  font-weight: normal;
  margin-bottom: 5px;
  display: block;
}

.baseMetricScore {
  display: block;
  font-size: 32px;
  line-height: 32px;
  font-weight: normal;
  margin-top: 4px;
}

.scoreRating {
  width: 100px;
  top: -4px;
  right: 20px;
  border: 2px solid #666666;
  background: #dddddd;
  font-size: 11px;
  border-radius: 10px;
  line-height: 150%;
  text-align: center;
  height: fit-content !important;
  position: absolute;
}

.scoreRating.Low {
  background: #ffcb0d;
  border: 2px solid #ffcb0d;
  color: white;
}

.scoreRating.Medium {
  background: #f9a009;
  border: 2px solid #f9a009;
  color: white;
}

.scoreRating.High {
  background: #df3d03;
  border: 2px solid #df3d03;
  color: white;
}

.scoreRating.Critical {
  background: #212121;
  border: 2px solid #212121;
  color: white;
}
</style>
