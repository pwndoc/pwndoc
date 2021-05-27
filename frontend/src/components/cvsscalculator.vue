<template>
  <q-card>
    <q-card-section class="row">
      <div class="col-md-6">CVSSv3 Base Score</div>
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
      <div class="col-md-6">
        <div class="q-my-sm text-weight-bold">Attack Vector</div>
        <q-btn-toggle
          class="group-btn"
          v-model="cvssObj.AV"
          toggle-color="grey-5"
          toggle-text-color="black"
          no-caps
          :options="cvssItems.AV"
        />
        <div class="q-my-sm text-weight-bold">Attack Complexity</div>
        <q-btn-toggle
          class="group-btn"
          v-model="cvssObj.AC"
          toggle-color="grey-5"
          toggle-text-color="black"
          no-caps
          :options="cvssItems.AC"
        />
        <div class="q-my-sm text-weight-bold">Privileges Required</div>
        <q-btn-toggle
          class="group-btn"
          v-model="cvssObj.PR"
          toggle-color="grey-5"
          toggle-text-color="black"
          no-caps
          :options="cvssItems.PR"
        />
        <div class="q-my-sm text-weight-bold">User Interaction</div>
        <q-btn-toggle
          class="group-btn"
          v-model="cvssObj.UI"
          toggle-color="grey-5"
          toggle-text-color="black"
          no-caps
          :options="cvssItems.UI"
        />
      </div>
      <div class="col-md-6">
        <div class="q-my-sm text-weight-bold">Scope</div>
        <q-btn-toggle
          class="group-btn"
          v-model="cvssObj.S"
          toggle-color="grey-5"
          toggle-text-color="black"
          no-caps
          :options="cvssItems.S"
        />
        <div class="q-my-sm text-weight-bold">Confidentiality</div>
        <q-btn-toggle
          class="group-btn"
          v-model="cvssObj.C"
          toggle-color="grey-5"
          toggle-text-color="black"
          no-caps
          :options="cvssItems.C"
        />
        <div class="q-my-sm text-weight-bold">Integrity</div>
        <q-btn-toggle
          class="group-btn"
          v-model="cvssObj.I"
          toggle-color="grey-5"
          toggle-text-color="black"
          no-caps
          :options="cvssItems.I"
        />
        <div class="q-my-sm text-weight-bold">Availability</div>
        <q-btn-toggle
          class="group-btn"
          v-model="cvssObj.A"
          toggle-color="grey-5"
          toggle-text-color="black"
          no-caps
          :options="cvssItems.A"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
export default {
  name: "cvss-calculator",
  props: ["cvssString", "cvssScore", "cvssSeverity"],

  data: function() {
    return {
      cvssItems: {
        AV: [
          { label: "Network", value: "N" },
          { label: "Adjacent Network", value: "A" },
          { label: "Local", value: "L" },
          { label: "Physical", value: "P" },
        ],
        AC: [
          { label: "Low", value: "L" },
          { label: "High", value: "H" },
        ],
        PR: [
          { label: "None", value: "N" },
          { label: "Low", value: "L" },
          { label: "High", value: "H" },
        ],
        UI: [
          { label: "None", value: "N" },
          { label: "Required", value: "R" },
        ],
        S: [
          { label: "Unchanged", value: "U" },
          { label: "Changed", value: "C" },
        ],
        C: [
          { label: "None", value: "N" },
          { label: "Low", value: "L" },
          { label: "High", value: "H" },
        ],
        I: [
          { label: "None", value: "N" },
          { label: "Low", value: "L" },
          { label: "High", value: "H" },
        ],
        A: [
          { label: "None", value: "N" },
          { label: "Low", value: "L" },
          { label: "High", value: "H" },
        ],
      },
      cvssObj: {},
      cvssLocal: this.cvssString,
      score: this.cvssScore,
      severity: this.cvssSeverity,
    };
  },

  created: function() {
    this.cvssStrToObject(this.cvssString);
  },

  watch: {
    cvssString: function(val) {
      this.cvssStrToObject(val);
    },
    cvssObj: {
      handler(newValue, oldValue) {
        this.cvssObjectToStr();
      },
      deep: true,
    },
  },

  methods: {
    cvssStrToObject(str) {
      this.cvssObj = {
        AV: "",
        AC: "",
        PR: "",
        UI: "",
        S: "",
        C: "",
        I: "",
        A: "",
      };
      if (str) {
        var temp = str.split("/");
        for (var i = 0; i < temp.length; i++) {
          var elt = temp[i].split(":");
          switch (elt[0]) {
            case "AV":
              this.cvssObj.AV = elt[1];
              break;
            case "AC":
              this.cvssObj.AC = elt[1];
              break;
            case "PR":
              this.cvssObj.PR = elt[1];
              break;
            case "UI":
              this.cvssObj.UI = elt[1];
              break;
            case "S":
              this.cvssObj.S = elt[1];
              break;
            case "C":
              this.cvssObj.C = elt[1];
              break;
            case "I":
              this.cvssObj.I = elt[1];
              break;
            case "A":
              this.cvssObj.A = elt[1];
              break;
            default:
              break;
          }
        }
      }
    },

    cvssObjectToStr() {
      var res = "CVSS:3.0";
      res += "/AV:" + this.cvssObj["AV"];
      res += "/AC:" + this.cvssObj["AC"];
      res += "/PR:" + this.cvssObj["PR"];
      res += "/UI:" + this.cvssObj["UI"];
      res += "/S:" + this.cvssObj["S"];
      res += "/C:" + this.cvssObj["C"];
      res += "/I:" + this.cvssObj["I"];
      res += "/A:" + this.cvssObj["A"];

      this.cvssLocal = res;
      this.$emit("cvssChange", this.cvssLocal);
      var tempCvss = CVSS.calculateCVSSFromVector(this.cvssLocal);
      if (tempCvss.success === true) {
        this.score = tempCvss.baseMetricScore;
        this.severity = tempCvss.baseSeverity;
      } else {
        this.score = 0;
        this.severity = "None";
      }
      this.$emit("cvssScoreChange", this.score);
      this.$emit("cvssSeverityChange", this.severity);
    },
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
