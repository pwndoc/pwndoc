<template>
	<q-drawer side="left" :model-value="true" :width="400">
		<q-splitter horizontal v-model="splitterRatio" :limits="[50, 80]" style="height: 100%">
			<template v-slot:before>
				<q-list class="home-drawer">
					<q-item style="padding:0px">
						<q-item-section avatar v-if="audit.type === 'multi'">
							<q-chip square size="md" outline color="green" :label="$t('multi')" />
						</q-item-section>
						<q-item-section avatar v-else-if="audit.type === 'retest'">
							<q-chip square outline color="orange" :label="$t('retest')" />
						</q-item-section>
						<q-item-section avatar v-else>
							<q-chip square size="md" outline color="info" :label="$t('audit')" />
						</q-item-section>
						<q-item-section />
						<template v-if="audit.type == 'default'">
							<q-item-section side>
								<q-btn
								v-if="auditRetest"
								class="q-mx-xs q-px-xs"
								size="11px"
								unelevated
								dense
								color="secondary"
								:label="$t('btn.topButtonSection.navigateRetest')"
								no-caps
								@click="goToAudit(auditRetest)"
								>
									<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.topButtonSection.navigateRetest')}}</q-tooltip> 
								</q-btn>
								<q-btn
								v-else
								class="q-mx-xs q-px-xs"
								size="11px"
								unelevated
								dense
								color="secondary"
								:label="$t('btn.topButtonSection.createRetest')"
								no-caps
								@click="(auditTypesRetest && auditTypesRetest.length === 1) ? createRetest(auditTypesRetest[0]) : ''"
								>
									<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.topButtonSection.createRetest')}}</q-tooltip> 
									<q-menu style="width: 300px" >
										<q-item clickable v-for="retest of auditTypesRetest" :key="retest.name">
											<q-item-section @click="createRetest(retest)">
												{{ retest.name }}
											</q-item-section>
										</q-item>
									</q-menu>
								</q-btn>
							</q-item-section>
						</template>
						<template v-if="$settings.reviews.enabled">
							<q-item-section side class="topButtonSection" v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT">
								<q-btn class="q-mx-xs q-px-xs" size="11px" unelevated dense color="secondary" :label="$t('btn.topButtonSection.submitReview')" no-caps @click="toggleAskReview" >
									<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.topButtonSection.submitReview')}}</q-tooltip> 
								</q-btn>
							</q-item-section>
							<q-item-section side class="topButtonSection" v-if="[AUDIT_VIEW_STATE.REVIEW_EDITOR, AUDIT_VIEW_STATE.REVIEW_ADMIN, AUDIT_VIEW_STATE.REVIEW_ADMIN_APPROVED].includes(frontEndAuditState)">
								<q-btn class="q-mx-xs q-px-xs" size="11px" unelevated dense color="amber-9" :label="$t('btn.topButtonSection.cancelReview')" no-caps @click="toggleAskReview" >
									<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.topButtonSection.cancelReview')}}</q-tooltip> 
								</q-btn>
							</q-item-section>
							<q-item-section side class="topButtonSection" v-if="[AUDIT_VIEW_STATE.REVIEW, AUDIT_VIEW_STATE.REVIEW_ADMIN].includes(frontEndAuditState)">
								<q-btn class="q-mx-xs q-px-xs" size="11px" unelevated dense color="green" :label="$t('btn.topButtonSection.approve')" no-caps @click="toggleApproval" >
									<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.topButtonSection.approve')}}</q-tooltip> 
								</q-btn>
							</q-item-section>
							<q-item-section side class="topButtonSection" v-if="[AUDIT_VIEW_STATE.REVIEW_APPROVED, AUDIT_VIEW_STATE.REVIEW_ADMIN_APPROVED, AUDIT_VIEW_STATE.APPROVED_APPROVED].includes(frontEndAuditState)">
								<q-btn class="q-mx-xs q-px-xs" size="11px" unelevated dense color="warning" :label="$t('btn.topButtonSection.removeApproval')" no-caps @click="toggleApproval" >
									<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.topButtonSection.removeApproval')}}</q-tooltip> 
								</q-btn>
							</q-item-section>
						</template>
						<q-item-section side class="topButtonSection">
							<q-btn flat color="info" @click="generateReport">
								<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.downloadReport')}}</q-tooltip> 
								<i class="fa fa-download fa-lg"></i>
							</q-btn>
						</q-item-section>
					</q-item>

					<q-item :to='"/audits/"+auditId+"/general"'>
						<q-item-section avatar>
							<q-icon name="fa fa-cog"></q-icon>
						</q-item-section>
						<q-item-section>{{$t('generalInformation')}}</q-item-section>
					</q-item>
					
					<div class="row">
						<div v-for="(user,idx) in generalUsers" :key="idx" class="col multi-colors-bar" :style="{background:user.color}" />
					</div>

					<q-item
					v-if="!currentAuditType || !currentAuditType.hidden.includes('network')"
					:to="'/audits/'+auditId+'/network'"
					>
						<q-item-section avatar>
							<q-icon name="fa fa-globe"></q-icon>
						</q-item-section>
						<q-item-section>{{$t('networkScan')}}</q-item-section>
					</q-item>

					<div class="row">
						<div v-for="(user,idx) in networkUsers" :key="idx" class="col multi-colors-bar" :style="{background:user.color}" />
					</div>

					<q-item
					v-if="!currentAuditType || !currentAuditType.hidden.includes('observations')"
					:to="'/audits/'+auditId+'/observations'"
					>
						<q-item-section avatar>
							<q-icon name="fa fa-clipboard-list"></q-icon>
						</q-item-section>
						<q-item-section>{{$t('observations')}}</q-item-section>
					</q-item>

					<div class="row">
						<div v-for="(user,idx) in observationUsers" :key="idx" class="col multi-colors-bar" :style="{background:user.color}" />
					</div>

					<div v-if="!currentAuditType || !currentAuditType.hidden.includes('findings')">
						<q-separator class="q-my-sm" />
						<q-item>
							<q-item-section avatar>
								<q-icon name="fa fa-list"></q-icon>
							</q-item-section>
							<q-item-section v-if="audit.type === 'multi'">{{$t('audits')}} ({{audit.findings.length || 0}})</q-item-section>
							<q-item-section v-else>{{$t('findings')}} ({{audit.findings.length || 0}})</q-item-section>
							<q-item-section avatar>
								<q-btn
								@click="$router.push('/audits/'+auditId+'/findings/add').catch(err=>{})"
								icon="add"
								round
								dense
								color="secondary"
								v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT && audit.type === 'default'"
								/>
								<q-btn
								@click="$router.push('/audits/'+auditId+'/audits/add').catch(err=>{})"
								icon="add"
								round
								dense
								color="secondary"
								v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT && audit.type === 'multi'"
								/>
							</q-item-section>
						</q-item>
						
						<div v-if="audit.type === 'multi'">
							<q-list no-border>
								<div class="q-mt-md"></div>
								<div v-for="audit of children" :key="audit._id">
									<q-item
									dense
									clickable
									>
										<q-item-section @click="$router.push(`/audits/${audit._id}`)">
											<span>{{audit.name}} <b>({{audit.auditType}})</b></span>
										</q-item-section>
										<q-item-section side>
											<q-btn
											v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
											size="sm"
											flat
											color="negative"
											@click="confirmDeleteParent(audit)" icon="fa fa-minus-circle">
												<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.removeAudit')}}</q-tooltip> 
											</q-btn>
										</q-item-section>
									</q-item>
								</div>
							</q-list>
						</div>
						<div v-else>
							<div v-for="categoryFindings of findingList" :key="categoryFindings.category">
								<q-item>
									<q-item-section>
										<q-item-label header>{{categoryFindings.category}}</q-item-label>
									</q-item-section>
									<q-item-section avatar>
										<q-btn icon="sort" flat v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT">
											<q-tooltip anchor="bottom middle" self="center left" :delay="500" class="text-bold">{{$t('tooltip.sortOptions')}}</q-tooltip>
											<q-menu style="width: 300px" anchor="bottom middle" self="top left">
												<q-item>
													<q-item-section>
														<q-toggle 
														v-model="categoryFindings.sortOption.sortAuto" 
														:label="$t('automaticSorting')"
														@update:model-value="updateSortFindings"
														/>
													</q-item-section>
												</q-item>
												<q-separator />
												<q-item>
													<q-item-section>
														<q-item-label>{{$t('sortBy')}}</q-item-label>
													</q-item-section>
												</q-item>
												<q-item>
													<q-item-section>
														<q-option-group
														v-model="categoryFindings.sortOption.sortValue"
														:options="getSortOptions(categoryFindings.sortOption.category)"
														type="radio"
														:disable="!categoryFindings.sortOption.sortAuto"
														@update:model-value="updateSortFindings"
														/>
													</q-item-section>
												</q-item>
												<q-separator />
												<q-item>
													<q-item-section>
														<q-btn 
														flat
														icon="fa fa-long-arrow-alt-up"
														:label="$t('ascending')"
														dense
														no-caps
														align="left"
														:disable="!categoryFindings.sortOption.sortAuto"
														:color="(categoryFindings.sortOption.sortOrder === 'asc')?'green':''" 
														@click="categoryFindings.sortOption.sortOrder = 'asc'; updateSortFindings()" 
														/>
													</q-item-section>
												</q-item>
												<q-item>
													<q-item-section>
														<q-btn 
														flat
														icon="fa fa-long-arrow-alt-down"
														:label="$t('descending')"
														dense
														no-caps
														align="left"
														:disable="!categoryFindings.sortOption.sortAuto"
														:color="(categoryFindings.sortOption.sortOrder === 'desc')?'green':''" 
														@click="categoryFindings.sortOption.sortOrder = 'desc'; updateSortFindings()" 
														/>
													</q-item-section>
												</q-item>
											</q-menu>
										</q-btn>
									</q-item-section>
								</q-item>
								<q-list no-border>
									<draggable
										:list="categoryFindings.findings"
										@end="moveFindingPosition($event, categoryFindings.category)"
										handle=".handle"
										ghost-class="drag-ghost"
										item-key="_id"
									>
										<template #item="{element: finding}">
											<div>
											<q-item
											dense
											class="cursor-pointer"
											:to="'/audits/'+auditId+'/findings/'+finding._id"
											>
												<q-item-section side v-if="!categoryFindings.sortOption.sortAuto && frontEndAuditState === AUDIT_VIEW_STATE.EDIT">
													<q-icon name="mdi-arrow-split-horizontal" class="cursor-pointer handle" color="grey" />
												</q-item-section>
												<q-item-section side>
													<q-chip
														class="text-white"
														size="sm"
														square
														:style="`background: ${getFindingColor(finding)}`"
													>{{getFindingSeverity(finding).substring(0,1)}}</q-chip>
												</q-item-section>
												<q-item-section>
													<span>{{finding.title}}</span>
												</q-item-section>
												<q-item-section side>
													<q-icon v-if="audit.type === 'default' && finding.status === 0" name="check" color="green" />
													<q-icon v-else-if="audit.type === 'retest' && finding.retestStatus === 'ok'" name="check" color="green" />
													<q-icon v-else-if="audit.type === 'retest' && finding.retestStatus === 'ko'" name="fas fa-xmark" color="red" />
													<q-icon v-else-if="audit.type === 'retest' && finding.retestStatus === 'partial'" name="priority_high" color="orange" />
													<q-icon v-else-if="audit.type === 'retest' && finding.retestStatus === 'unknown'" name="question_mark" color="brown" />
												</q-item-section>
											</q-item>
											<div class="row">
												<template v-for="(user,idx) in findingUsers" :key="idx">
													<div v-if="user.finding === finding._id" class="col multi-colors-bar" :style="{background:user.color}" />
												</template>
											</div>
										</div>
										</template>
									</draggable>
								</q-list>
							</div>
						</div>

						<q-separator class="q-my-sm" />
					</div>
					<q-list v-for="section of audit.sections" :key="section._id">
						<q-item :to="'/audits/'+auditId+'/sections/'+section._id">
							<q-item-section avatar>
								<q-icon :name="getSectionIcon(section)"></q-icon>
							</q-item-section>
							<q-item-section>
								<span>{{section.name}}</span>
							</q-item-section>
						</q-item>
						<div class="row">
							<template v-for="(user,idx) in sectionUsers" :key="idx">
								<div v-if="user.section === section._id" class="col multi-colors-bar" :style="{background:user.color}" />
							</template>
						</div>
					</q-list>
				</q-list>
			</template>
			<template v-slot:after>
				<q-list>
					<q-separator />
					<q-item class="q-py-lg">
						<q-item-section avatar>
							<q-icon name="fa fa-user"></q-icon>
						</q-item-section>
						<q-item-section>{{$t('usersConnected')}}</q-item-section>	
					</q-item>
					<q-list dense>
						<q-item v-for="user of users" :key="user._id">
							<q-item-section side>
								<q-chip :style="{'background-color':user.color}" square size="sm" />
							</q-item-section>
							<q-item-section>
								<span v-if="user.me">{{user.username}} ({{$t('me')}})</span>
								<span v-else>{{user.username}}</span>
							</q-item-section>
						</q-item>
					</q-list>
				</q-list>
			</template>
			
		</q-splitter>
	</q-drawer>
	<router-view :key="$route.fullPath"/>
</template>

<script>
import { Dialog, Notify, QSpinnerGears, LocalStorage } from 'quasar';
import { computed, ref } from 'vue';
import draggable from 'vuedraggable'
import CommentsList from 'components/comments-list'

import AuditService from '@/services/audit';
import { useUserStore } from 'src/stores/user'
import DataService from '@/services/data';
import Utils from '@/services/utils';

import { $t } from '@/boot/i18n';

import { Cvss4P0 } from 'ae-cvss-calculator'
import { Cvss3P1 } from 'ae-cvss-calculator'

const userStore = useUserStore()

// 2-way reactive values to provide
const auditR = ref({findings: {}, comments: []})
const retestSplitViewR = ref(false)
const retestSplitRatioR = ref(100)
const retestSplitLimitsR = ref([100, 100])
const commentModeR = ref(false)
const focusedCommentR = ref("")
const editCommentR = ref(null)
const editReplyR = ref(null)
const fieldHighlightedR = ref(null)

export default {
	data () {
		return {
			auditId: "",
			findings: [],
			users: [],
			audit: auditR,
			sections: [],
			splitterRatio: 80,
			loading: true,
			vulnCategories: [],
			customFields: [],
			auditTypes: [],
			findingList: [],
			frontEndAuditState: Utils.AUDIT_VIEW_STATE.EDIT_READONLY,
			AUDIT_VIEW_STATE: Utils.AUDIT_VIEW_STATE,
			auditRetest: "",
			auditTypesRetest: [],
			retestSplitView: retestSplitViewR,
			retestSplitRatio: retestSplitRatioR,
			retestSplitLimits: retestSplitLimitsR,
			children: [],
			commentMode: commentModeR,
			focusedComment: focusedCommentR,
			editComment: editCommentR,
			editReply: editReplyR,
            fieldHighlighted: fieldHighlightedR,
            commentsFilter: "all" // [all, active, resolved]
		}
	},

	provide() {
		return {
			frontEndAuditState: computed(() => this.frontEndAuditState),
			auditParent: auditR,
			retestSplitView: retestSplitViewR,
			retestSplitRatio: retestSplitRatioR,
			retestSplitLimits: retestSplitLimitsR,
			commentMode: commentModeR,
			focusedComment: focusedCommentR,
			editComment: editCommentR,
			editReply: editReplyR,
			replyingComment: computed(() => this.replyingComment),
			fieldHighlighted: fieldHighlightedR,
			commentIdList: computed(() => this.commentIdList),
			customFields: computed(() => this.customFields),
		}
	},

	components: {
		draggable,
		CommentsList
	},

	created: function() {
		this.auditId = this.$route.params.auditId;
		this.getCustomFields();
		this.getAuditTypes();
		this.getAudit(); // Calls getSections
		this.getRetest();
		this.getAuditChildren();
	},

	unmounted: function() {
		if (!this.loading) {
			this.$socket.emit('leave', {username: userStore.username, room: this.auditId});
			this.$socket.off()
		}

		// Reset reactive values
		auditR.value = {findings: {}, comments: []}
		retestSplitViewR.value = false
		retestSplitRatioR.value = 100
		retestSplitLimitsR.value = [100, 100]
		commentModeR.value = false
		focusedCommentR.value = ""
		editCommentR.value = null
		editReplyR.value = null
		fieldHighlightedR.value = null
	},

	watch: {
		'audit.findings': {
			handler(newVal, oldVal) {
				var result = _.chain(this.audit.findings)
				.groupBy("category")
				.map((value, key) => {
					if (key === 'undefined') key = 'No Category'
					var sortOption = this.audit.sortFindings.find(option => option.category === key) // Get sort option saved in audit
					
					if (!sortOption) { // no option for category in audit
						sortOption = this.vulnCategories.find(e => e.name === key) // Get sort option from default in vulnerability category
						if (sortOption) // found sort option from vuln categories
							sortOption.category = sortOption.name
						else // no default option or category don't exist
							sortOption = {category: key, sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true} // set a default sort option
						
						this.audit.sortFindings.push({
							category: sortOption.category,
							sortValue: sortOption.sortValue,
							sortOrder: sortOption.sortOrder,
							sortAuto: sortOption.sortAuto
						})
					}
					
					return {category: key, findings: value, sortOption: sortOption}
				})
				.value()

				this.findingList = result
			},
			deep: true,
			immediate: true
		},
		commentMode(value) {
			// Reset variables if commentMode is disabled
			if (!value) {
				this.fieldHighlighted = ""
				this.focusedComment = null
				this.editComment = null
				this.editReply = null
				this.commentsFilter = "all"
			}
		}
	},

	computed: {
		generalUsers: function() {return this.users.filter(user => user.menu === 'general')},
		networkUsers: function() {return this.users.filter(user => user.menu === 'network')},
		observationUsers: function() {return this.users.filter(user => user.menu === 'observations' || user.menu === 'editObservation')},
		findingUsers: function() {return this.users.filter(user => user.menu === 'editFinding')},
		sectionUsers: function() {return this.users.filter(user => user.menu === 'editSection')},

		currentAuditType: function() {
			return this.auditTypes.find(e => e.name === this.audit.auditType)
		},

		replyingComment: function() {
            return this.audit.comments.some(comment => !!comment.replyTemp)
        },

		systemLanguage: function() {
			return LocalStorage.getItem('system_language') || 'en-US'
		},

		commentIdList: function() {
            return this.audit.comments.map(e => e._id)
        }
	},

	methods: {
		getFindingColor: function(finding) {
			let severity = this.getFindingSeverity(finding)

			if(this.$settings.report) {
				const severityColorName = `${severity.toLowerCase()}Color`;
				const cvssColors = this.$settings.report.public.cvssColors;

				return cvssColors[severityColorName] || cvssColors.noneColor;
			} else {
				switch(severity) {
					case "Low": 
						return "green";
					case "Medium":
						return "orange";
					case "High":
						return "red";
					case "Critical":
						return "black";
					default:
						return "blue";
				}
			}
		},

		getFindingSeverity: function(finding) {
			let severity = "None"
			let cvss = null

			if (this.$settings.report.public.scoringMethods.CVSS4 && finding.cvssv4) {
				cvss = new Cvss4P0(finding.cvssv4).createJsonSchema()
			} else if (this.$settings.report.public.scoringMethods.CVSS3 && finding.cvssv3) {
				cvss = new Cvss3P1(finding.cvssv3).createJsonSchema()
			}

			if (cvss && cvss.baseScore >= 0) {
				severity = cvss.baseSeverity

				let category = finding.category || "No Category"
				let sortOption = this.audit.sortFindings.find(e => e.category === category)

				if (sortOption) {
					if (sortOption.sortValue === "cvssEnvironmentalScore")
						severity = cvss.environmentalSeverity
					else if (sortOption.sortValue === "cvssTemporalScore")
						severity = cvss.temporalSeverity
				}
			}
			return severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
		},

		getMenuSection: function() {
			if (this.$router.currentRoute.name && this.$router.currentRoute.name === 'general')
				return {menu: 'general', room: this.auditId}
			else if (this.$router.currentRoute.name && this.$router.currentRoute.name === 'network')
				return {menu: 'network', room: this.auditId}
			else if (this.$router.currentRoute.name && this.$router.currentRoute.name === 'observations')
				return {menu: 'observations', room: this.auditId}
			else if (this.$router.currentRoute.name && this.$router.currentRoute.name === 'editObservation' && this.$router.currentRoute.params.observationId)
				return {menu: 'editObservation', observation: this.$router.currentRoute.params.observationId, room: this.auditId}
			else if (this.$router.currentRoute.name && this.$router.currentRoute.name === 'addFindings')
				return {menu: 'addFindings', room: this.auditId}
			else if (this.$router.currentRoute.name && this.$router.currentRoute.name === 'editFinding' && this.$router.currentRoute.params.findingId)
				return {menu: 'editFinding', finding: this.$router.currentRoute.params.findingId, room: this.auditId}
			else if (this.$router.currentRoute.name && this.$router.currentRoute.name === 'editSection' && this.$router.currentRoute.params.sectionId)
				return {menu: 'editSection', section: this.$router.currentRoute.params.sectionId, room: this.auditId}
			else if (this.$router.currentRoute.name && this.$router.currentRoute.name === 'addAudits')
				return {menu: 'addAudits', room: this.auditId}

			return {menu: 'undefined', room: this.auditId}
		},

		// Sockets handle
		handleSocket: function() {
			this.$socket.emit('join', {username: userStore.username, room: this.auditId});
			this.$socket.on('roomUsers', (users) => {
				var userIndex = 0;
				this.users = users.map((user,index) => {
					if (user.username === userStore.username) {
						user.color = "#77C84E";
						user.me = true;
						userIndex = index;
					}
					return user;
				});
				this.users.unshift(this.users.splice(userIndex, 1)[0]);
			})
			this.$socket.on('updateUsers', () => {
				this.$socket.emit('updateUsers', {room: this.auditId})
			})
			this.$socket.on('updateAudit', () => {
				this.getAudit();
				this.getAuditChildren();
			})
			this.$socket.on('disconnect', () => {
				this.$socket.emit('join', {username: userStore.username, room: this.auditId})
				this.$socket.emit('menu', this.getMenuSection())
			})
		},
		// Tells the UI if the user is supposed to be reviewing the audit
		isUserAReviewer: function() {
			var isAuthor = this.audit.creator._id === userStore.id;
			var isCollaborator = this.audit.collaborators.some((element) => element._id === userStore.id);
			var isReviewer = this.audit.reviewers.some((element) => element._id === userStore.id);
			var hasReviewAll = userStore.isAllowed('audits:review-all');
			return !(isAuthor || isCollaborator) && (isReviewer || hasReviewAll);
		},

		// Tells the UI if the user is supposed to be editing the audit
		isUserAnEditor: function() {
			var isAuthor = this.audit.creator._id === userStore.id;
			var isCollaborator = this.audit.collaborators.some((element) => element._id === userStore.id);
			var hasUpdateAll = userStore.isAllowed('audits:update-all');
			return (isAuthor || isCollaborator || hasUpdateAll);
		},

		userHasAlreadyApproved: function() {
			return this.audit.approvals.some((element) => element._id === userStore.id);
		},

		getUIState: function() {
			if(!this.$settings.reviews.enabled || this.audit.state === "EDIT") {
				this.frontEndAuditState = this.isUserAnEditor() ? Utils.AUDIT_VIEW_STATE.EDIT : Utils.AUDIT_VIEW_STATE.EDIT_READONLY;
			} 
			else if (this.audit.state === "REVIEW") {
				if (!this.isUserAReviewer()) {
					this.frontEndAuditState = this.isUserAnEditor()? Utils.AUDIT_VIEW_STATE.REVIEW_EDITOR : Utils.AUDIT_VIEW_STATE.REVIEW_READONLY;
					return;
				}
				if (this.isUserAnEditor()) {
					this.frontEndAuditState = this.userHasAlreadyApproved() ? Utils.AUDIT_VIEW_STATE.REVIEW_ADMIN_APPROVED : Utils.AUDIT_VIEW_STATE.REVIEW_ADMIN;
					return;
				}
				this.frontEndAuditState = this.userHasAlreadyApproved() ? Utils.AUDIT_VIEW_STATE.REVIEW_APPROVED : Utils.AUDIT_VIEW_STATE.REVIEW;
			} 
			else if (this.audit.state === "APPROVED") {
				if (!this.isUserAReviewer()) {
					this.frontEndAuditState = Utils.AUDIT_VIEW_STATE.APPROVED_READONLY;
				} else {
					this.frontEndAuditState = this.userHasAlreadyApproved() ? Utils.AUDIT_VIEW_STATE.APPROVED_APPROVED : Utils.AUDIT_VIEW_STATE.APPROVED
				}
			}
		},

		getAudit: function() {
			DataService.getVulnerabilityCategories() // Vuln Categories must exist before getting audit data for handling default sort options
			.then(data => {
				this.vulnCategories = data.data.datas
				return AuditService.getAudit(this.auditId)
			})
			.then((data) => {
				this.audit = data.data.datas;
				this.getUIState()
				this.getSections()
				if (this.loading)
					this.handleSocket()
				this.loading = false
			})
			.catch((err) => {
				console.log(err)
				if (err.response.status === 403)
					this.$router.push({name: '403', query: {error: err.response.data.datas}})
				else if (err.response.status === 404)
					this.$router.push({name: '404', query: {error: err.response.data.datas}})
			})
		},

		getAuditChildren: function() {
			AuditService.getAuditChildren(this.auditId)
			.then((data) => {
				this.children = data.data.datas
			})
			.catch((err) => {
				console.log(err)
			})
		},

		getCustomFields: function() {
			DataService.getCustomFields()
			.then((data) => {
				this.customFields = data.data.datas;
			})
			.catch((err) => {
				console.log(err);
			})
		},

		getSections: function() {
			DataService.getSections()
			.then((data) => {
				this.sections = data.data.datas;
			})
			.catch((err) => {
				console.log(err);
			})
		},

		getSectionIcon: function(section) {
			var section = this.sections.find(e => e.field === section.field)
			if (section)
				return section.icon || 'notes'
			return 'notes'
		},

		getAuditTypes: function() {
			DataService.getAuditTypes()
			.then((data) => {
				this.auditTypes = data.data.datas;
				this.auditTypesRetest = this.auditTypes.filter(e => e.stage == 'retest')
			})
			.catch((err) => {
				console.log(err);
			})
		},

		// Convert blob to text
		BlobReader: function(data) {
			const fileReader = new FileReader();

			return new Promise((resolve, reject) => {
				fileReader.onerror = () => {
					fileReader.abort()
					reject(new Error('Problem parsing blob'));
				}

				fileReader.onload = () => {
					resolve(fileReader.result)
				}

				fileReader.readAsText(data)
			})
		},

		generateReport: function() {
			const downloadNotif = Notify.create({
				spinner: QSpinnerGears,
				message: 'Generating the Report',
				color: "blue",
				timeout: 0,
				group: false
			})
			AuditService.generateAuditReport(this.auditId)
			.then(response => {
				var blob = new Blob([response.data], {type: "application/octet-stream"});
				var link = document.createElement('a');
				link.href = window.URL.createObjectURL(blob);
				link.download = response.headers['content-disposition'].split('"')[1];
				document.body.appendChild(link);
				link.click();
				link.remove();
				
				downloadNotif({
					icon: 'done',
					spinner: false,
					message: 'Report successfully generated',
					color: 'green',
					timeout: 2500
				})
			})
			.catch( async err => {
				var message = "Error generating template"
				if (err.response && err.response.data) {
					var blob = new Blob([err.response.data], {type: "application/json"})
					var blobData = await this.BlobReader(blob)
					message = JSON.parse(blobData).datas
				}
				downloadNotif()
				Notify.create({
					message: message,
					type: 'negative',
					textColor:'white',
					position: 'top',
					closeBtn: true,
					timeout: 0,
					classes: "text-pre-wrap"
				})
			})
		},

		updateSortFindings: function() {
			AuditService.updateAuditSortFindings(this.auditId, {sortFindings: this.audit.sortFindings})
		},

		getSortOptions: function(category) {
			var options = [
				{label: $t('cvssScore'), value: 'cvssScore'},
				{label: $t('cvssTemporalScore'), value: 'cvssTemporalScore'},
				{label: $t('cvssEnvironmentalScore'), value: 'cvssEnvironmentalScore'},
				{label: $t('priority'), value: 'priority'},
				{label: $t('remediationDifficulty'), value: 'remediationComplexity'}
			]
			var allowedFieldTypes = ['date', 'input', 'radio', 'select']
			this.customFields.forEach(e => {
				if (
					(e.display === 'finding' || e.display === 'vulnerability') && 
					(!e.displaySub || e.displaySub === category) && 
					allowedFieldTypes.includes(e.fieldType)
				) {
					options.push({label: e.label, value: e.label})
				}
			})
			return options
		},

		moveFindingPosition: function(event, category) {
			var index = this.audit.findings.findIndex(e => {
				if (category === 'No Category')
					return !e.category
				else
					return e.category === category
			})
			if (index > -1) {
				var realOldIndex = event.oldIndex + index
				var realNewIndex = event.newIndex + index

				AuditService.updateAuditFindingPosition(this.auditId, {oldIndex: realOldIndex, newIndex: realNewIndex})
				.then(msg => this.getAudit())
				.catch(err => {
					console.log(err.response.data.datas)
					Notify.create({
						message: err.response.data.datas || err.message,
						color: 'negative',
						textColor:'white',
						position: 'top-right'
					})
					this.getAudit()
				})
			}
		},

		toggleAskReview: function() {
			AuditService.updateReadyForReview(this.auditId, { state: this.audit.state === "EDIT" ? "REVIEW" : "EDIT" })
			.then(() => {
				this.audit.state = this.audit.state === "EDIT" ? "REVIEW" : "EDIT";
				this.getUIState();
				Notify.create({
					message: $t('msg.auditReviewUpdateOk'),
					color: 'positive',
					textColor:'white',
					position: 'top-right'
				})
			})
			.catch((err) => {     
				console.log(err)
				Notify.create({
					message: err.response.data.datas || err.message,
					color: 'negative',
					textColor:'white',
					position: 'top-right'
				})
			});
		},

		toggleApproval: function() {
			AuditService.toggleApproval(this.auditId)
			.then(() => {
				Notify.create({
					message: $t('msg.auditApprovalUpdateOk'),
					color: 'positive',
					textColor:'white',
					position: 'top-right'
				})
			})
			.catch((err) => {          
				console.log(err)
				Notify.create({
					message: err.response.data.datas || err.message,
					color: 'negative',
					textColor:'white',
					position: 'top-right'
				})
			});
		},

		goToAudit: function(auditId) {
			this.$router.push({path: `/audits/${auditId}`, query: {retest: true}})
		},

		getRetest: function() {
			AuditService.getRetest(this.auditId)
			.then((msg) => {
				if (msg)
					this.auditRetest = msg.data.datas._id
			})
			.catch((err) => {
				// console.log(err)
			})
		},

		createRetest: function(auditType) {
			AuditService.createRetest(this.auditId, {auditType: auditType.name})
			.then((msg) => {
				if (msg.data.datas.audit._id)
					this.$router.push(`/audits/${msg.data.datas.audit._id}`)
			})
			.catch((err) => {
				console.log(err)
				Notify.create({
					message: err.response.data.datas || err.message,
					color: 'negative',
					textColor:'white',
					position: 'top-right'
				})
			})
		},

		deleteParent: function(auditId) {
			AuditService.deleteAuditParent(auditId)
			.then(() => {
				Notify.create({
					message: 'Audit removed successfully',
					color: 'positive',
					textColor:'white',
					position: 'top-right'
				})
			})
			.catch((err) => {
				Notify.create({
					message: err.response.data.datas,
					color: 'negative',
					textColor:'white',
					position: 'top-right'
				})
			})
		},

		confirmDeleteParent: function(audit) {
			Dialog.create({
				title: $t('msg.confirmSuppression'),
				message: `${$t('audit')} «${audit.name}» ${$t('willBeRemoved')}`,
				ok: {label: $t('btn.confirm'), color: 'negative'},
				cancel: {label: $t('btn.cancel'), color: 'white'},
				focus: 'cancel'
			})
			.onOk(() => this.deleteParent(audit._id))
		},

		getAuditComments: function() {
			AuditService.getAuditComments(this.auditId)
			.then((msg) => {
				if (msg)
					this.comments = msg.data.datas
			})
			.catch((err) => {
				// console.log(err)
			})
		},
	}
}
</script>

<style lang="scss">
.edit-container {
	margin-top: 50px;
}

.edit-breadcrumb {
	position: fixed;
	top: 50px;
	right: 0;
	left: 300px;
	z-index: 1;
}

.q-menu > .q-item--active {
	color: white;
	background-color: $blue-14;
}

.card-screenshots {
	height: calc(100vh - 120px); /* 100% Full-height */
	overflow-x: hidden; /* Disable horizontal scroll */
	margin-right: 16px;
}

.affix {
	width: calc(16.6667% - 69px);
}

.caption-text input {
	text-align: center;
}

.multi-colors-bar {
	height: 5px;
}

.drawer-footer {
	background-color: white;
	color: black;
	font-size: 12px;
}

.topButtonSection {
    padding-left: 0px!important;
	padding-right: 0px!important;
}

.highlighted-border {
    border: 2px solid $deep-purple;
}

.sidebar-comments {
    position: fixed;
    right: 8px;
}
</style>
