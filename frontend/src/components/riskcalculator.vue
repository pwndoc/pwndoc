<template>
  <q-card>
    <q-card-section class="row">
      <div class="col-md-6">OWASP Risk Rating</div>

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
      <div class="text-h6 col-md-12">Impact</div>
      <div class="text-subtitle2 col-md-12">Threat Agent Factors</div>
      <q-select
        label="Skill Level"
        hint="How technically skilled is this group of threat agents?"
        stack-label
        class="col-md-6"
        v-model="skillLevel"
        :options="[
          { label: 'No technical skills (1)', value: 1 },
          { label: 'Some technical skills (3)', value: 3 },
          { label: 'Advanced computer user (5)', value: 5 },
          { label: 'Network and programming skills (6)', value: 6 },
          { label: 'Security penetration skills (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />

      <q-select
        label="Motive"
        hint="How motivated is this group of threat agents to find and exploit this vulnerability?"
        stack-label
        class="col-md-6"
        v-model="motive"
        :options="[
          { label: 'Low or no reward (1)', value: 1 },
          { label: 'Possible reward (4)', value: 4 },
          { label: 'High reward (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Opportunity"
        hint="What resources and opportunities are required for this group of threat agents to find and exploit this vulnerability? "
        stack-label
        class="col-md-6"
        v-model="opportunity"
        :options="[
          {
            label: 'Full access or expensive resources required (0)',
            value: 0,
          },
          { label: 'Special access or resources required (4)', value: 4 },
          { label: 'Some access or resources required (7)', value: 7 },
          { label: 'No access or resources required (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Size"
        hint="How large is this group of threat agents?"
        stack-label
        class="col-md-6"
        v-model="size"
        :options="[
          { label: 'Developers (2)', value: 2 },
          { label: 'System administrators (2)', value: 2 },
          { label: 'Intranet users (4)', value: 4 },
          { label: 'Partners (5)', value: 5 },
          { label: 'Authenticated users (6)', value: 6 },
          { label: 'Anonymous Internet users (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <div class="text-subtitle2 col-md-12">Vulnerability Factors</div>
      <q-select
        label="Ease of Discovery"
        hint="How easy is it for this group of threat agents to discover this vulnerability?"
        stack-label
        class="col-md-6"
        v-model="easyOfDiscovery"
        :options="[
          { label: 'Practically impossible (1)', value: 1 },
          { label: 'Difficult (3)', value: 3 },
          { label: 'Easy (7)', value: 7 },
          { label: 'Automated tools available (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Ease of Exploit"
        hint="How easy is it for this group of threat agents to actually exploit this vulnerability?"
        stack-label
        class="col-md-6"
        v-model="easyOfExploit"
        :options="[
          { label: 'Theoretical (1)', value: 1 },
          { label: 'Difficult (3)', value: 3 },
          { label: 'Easy (5)', value: 5 },
          { label: 'Automated tools available (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Awareness"
        hint="How well known is this vulnerability to this group of threat agents?"
        stack-label
        class="col-md-6"
        v-model="awareness"
        :options="[
          {
            label: 'Unknown (1)',
            value: 1,
          },
          { label: 'Hidden (4)', value: 4 },
          { label: 'Obvious (6)', value: 6 },
          { label: 'Public knowledge (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Intrusion Detection"
        hint="How likely is an exploit to be detected?"
        stack-label
        class="col-md-6"
        v-model="intrusionDetection"
        :options="[
          { label: 'Active detection in application (1)', value: 1 },
          { label: 'Logged and reviewed (3)', value: 3 },
          { label: 'Logged without review (8)', value: 8 },
          { label: 'Not logged (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
    </q-card-section>
    <q-separator />

    <q-card-section class="row q-col-gutter-md">
      <div class="text-h6 col-md-12">Probability</div>

      <div class="text-subtitle2 col-md-12">Technical Impact Factors</div>
      <q-select
        label="Loss of Confidentiality"
        hint="How much data could be disclosed and how sensitive is it? "
        stack-label
        class="col-md-6"
        v-model="lossOfConfidentiality"
        :options="[
          { label: 'Minimal non-sensitive data disclosed (2)', value: 2 },
          { label: 'Minimal critical data disclosed (6)', value: 6 },
          { label: 'Extensive non-sensitive data disclosed (6)', value: 6 },
          { label: 'Extensive critical data disclosed (7)', value: 7 },
          { label: 'All data disclosed (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />

      <q-select
        label="Loss of Integrity"
        hint="How much data could be corrupted and how damaged is it?"
        stack-label
        class="col-md-6"
        v-model="lossOfIntegrity"
        :options="[
          { label: 'Minimal slightly corrupt data (1)', value: 1 },
          { label: 'Minimal seriously corrupt data (3)', value: 3 },
          { label: 'Extensive slightly corrupt data (5)', value: 5 },
          { label: 'Extensive seriously corrupt data (7)', value: 7 },
          { label: 'All data totally corrupt (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Loss of Availability"
        hint="How much service could be lost and how vital is it?"
        stack-label
        class="col-md-6"
        v-model="lossOfAvailability"
        :options="[
          {
            label: 'Minimal secondary services interrupted (1)',
            value: 1,
          },
          { label: 'Minimal primary services interrupted (5)', value: 5 },
          { label: 'Extensive secondary services interrupted (5)', value: 5 },
          { label: 'Extensive primary services interrupted (7)', value: 7 },
          { label: 'All services completely lost (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Loss of Accountability"
        hint="Are the threat agents’ actions traceable to an individual?"
        stack-label
        class="col-md-6"
        v-model="lossOfAccountability"
        :options="[
          { label: 'Fully traceable (1)', value: 1 },
          { label: 'Possibly traceable (7)', value: 7 },
          { label: 'Completely anonymous (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <div class="text-subtitle2 col-md-12">Business Impact Factors</div>
      <q-select
        label="Financial damage"
        hint="How much financial damage will result from an exploit?"
        stack-label
        class="col-md-6"
        v-model="financialDamage"
        :options="[
          {
            label: 'Less than the cost to fix the vulnerability (1)',
            value: 1,
          },
          { label: 'Minor effect on annual profit (3)', value: 3 },
          { label: 'Significant effect on annual profit (7)', value: 7 },
          { label: 'Bankruptcy (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Reputation damage"
        hint="Would an exploit result in reputation damage that would harm the business?"
        stack-label
        class="col-md-6"
        v-model="reputationDamage"
        :options="[
          { label: 'Minimal damage (1)', value: 1 },
          { label: 'Loss of major accounts (4)', value: 4 },
          { label: 'Loss of goodwill (5)', value: 5 },
          { label: 'Brand damage (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Non-compliance"
        hint="How much exposure does non-compliance introduce?"
        stack-label
        class="col-md-6"
        v-model="nonCompliance"
        :options="[
          {
            label: 'Minor violation (2)',
            value: 2,
          },
          { label: 'Clear violation (5)', value: 5 },
          { label: 'High profile violation (7)', value: 7 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
      <q-select
        label="Privacy violation"
        hint="How much personally identifiable information could be disclosed?"
        stack-label
        class="col-md-6"
        v-model="privacyViolation"
        :options="[
          { label: 'One individual (3)', value: 3 },
          { label: 'Hundreds of people (5)', value: 5 },
          { label: 'Thousands of people (7)', value: 7 },
          { label: 'Millions of people (9)', value: 9 },
        ]"
        map-options
        emit-value
        options-sanitize
        outlined
        bg-color="white"
        clearable
      />
    </q-card-section>
  </q-card>
</template>

<script>
export default {
  name: "risk-calculator",
  props: ["riskImpact", "riskProbability", "riskScore", "riskSeverity"],
  watch: {
    impact: function (val) {
      this.$emit("riskImpactChange", val);
      this.calculateScore();
    },
    probability: function (val) {
      this.$emit("riskProbabilityChange", val);
      this.calculateScore();
    },
    skillLevel: function (val) {
      // this.$emit("riskProbabilityChange", val);
      this.calculateOwaspRating();
    },
    motive: function (val) {
      // this.$emit("riskProbabilityChange", val);
      this.calculateOwaspRating();
    },
    opportunity: function (val) {
      // this.$emit("riskProbabilityChange", val);
      this.calculateOwaspRating();
    },
    size: function (val) {
      // this.$emit("riskProbabilityChange", val);
      this.calculateOwaspRating();
    },
    easyOfDiscovery: function (val) {
      // this.$emit("riskProbabilityChange", val);
      this.calculateOwaspRating();
    },
    easyOfExploit: function (val) {
      // this.$emit("riskProbabilityChange", val);
      this.calculateOwaspRating();
    },
    awareness: function (val) {
      // this.$emit("riskProbabilityChange", val);
      this.calculateOwaspRating();
    },
    intrusionDetection: function (val) {
      // this.$emit("riskProbabilityChange", val);
      this.calculateOwaspRating();
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
    calculateOwaspRating() {
      if (
        this.skillLevel &&
        this.motive &&
        this.opportunity &&
        this.size &&
        this.easyOfDiscovery &&
        this.easyOfExploit &&
        this.awareness &&
        this.intrusionDetection
      ) {
        const impactSum =
          this.skillLevel +
          this.motive +
          this.opportunity +
          this.size +
          this.easyOfDiscovery +
          this.easyOfExploit +
          this.awareness +
          this.intrusionDetection;
        const impactRating = impactSum / 8;

        console.log({ impactSum, impactRating });
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

  data: function () {
    return {
      impact: this.riskImpact,
      probability: this.riskProbability,
      score: this.riskScore,
      severity: this.riskSeverity,
      skillLevel: "",
      motive: "",
      opportunity: "",
      size: "",
      easyOfDiscovery: "",
      easyOfExploit: "",
      awareness: "",
      intrusionDetection: "",
      lossOfConfidentiality: "",
      lossOfIntegrity: "",
      lossOfAvailability: "",
      lossOfAccountability: "",
      financialDamage: "",
      reputationDamage: "",
      nonCompliance: "",
      privacyViolation: "",
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
