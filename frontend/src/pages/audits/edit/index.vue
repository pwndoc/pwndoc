<template>
<div>
	<q-drawer side="left" :value="true" :width="400">
		<q-splitter horizontal v-model="splitterRatio" :limits="[50, 80]" style="height: 100%">
			<template v-slot:before>
				<q-list class="home-drawer">
					<q-item>
						<q-item-section>Sections</q-item-section>
						<q-item-section side>
							<q-btn flat dense size="sm" color="info" icon="fa fa-download" @click="generateReport">
								<q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">Download Report</q-tooltip> 
							</q-btn>
						</q-item-section>
					</q-item>

					<q-item :to='"/audits/"+auditId+"/general"'>
						<q-item-section avatar>
							<q-icon name="fa fa-cog"></q-icon>
						</q-item-section>
						<q-item-section>General Information</q-item-section>
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
						<q-item-section>Network Scan</q-item-section>
					</q-item>

					<div class="row">
						<div v-for="(user,idx) in networkUsers" :key="idx" class="col multi-colors-bar" :style="{background:user.color}" />
					</div>

					<div v-if="!currentAuditType || !currentAuditType.hidden.includes('findings')">
						<q-separator class="q-my-sm" />
						<q-item>
							<q-item-section avatar>
								<q-icon name="fa fa-list"></q-icon>
							</q-item-section>
							<q-item-section>Findings ({{audit.findings.length || 0}})</q-item-section>
							<q-item-section avatar>
								<q-btn
								@click="$router.push('/audits/'+auditId+'/findings/add').catch(err=>{})"
								icon="add"
								round
								dense
								color="secondary"
								v-if="isEditing"
								/>
							</q-item-section>
						</q-item>
						
						<div v-for="categoryFindings of findingList" :key="categoryFindings.category">
							<q-item-label header>{{categoryFindings.category}}</q-item-label>
							<q-list no-border v-for="finding of categoryFindings.findings" :key="finding._id">
								<q-item
								dense
								class="cursor-pointer"
								:to="'/audits/'+auditId+'/findings/'+finding._id"
								>
									<q-item-section side>
										<q-chip
											class="text-white"
											size="sm"
											square
											:color="getFindingColor(finding)"
										>{{(finding.cvssSeverity)?finding.cvssSeverity.substring(0,1):"N"}}</q-chip>
									</q-item-section>
									<q-item-section>
										<span>{{finding.title}}</span>
									</q-item-section>
									<q-item-section side v-if="finding.status === 0">
										<q-icon name="check" color="green" />
									</q-item-section>
								</q-item>
								<div class="row">
									<div v-for="(user,idx) in findingUsers" :key="idx" v-if="user.finding === finding._id" class="col multi-colors-bar" :style="{background:user.color}" />
								</div>
							</q-list>
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
							<div v-for="(user,idx) in sectionUsers" :key="idx" v-if="user.section === section._id" class="col multi-colors-bar" :style="{background:user.color}" />
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
						<q-item-section>Users Connected</q-item-section>	
					</q-item>
					<q-list dense>
						<q-item v-for="user of users" :key="user._id">
							<q-item-section side>
								<q-chip :style="{'background-color':user.color}" square size="sm" />
							</q-item-section>
							<q-item-section>
								<span v-if="user.me">{{user.username}} (me)</span>
								<span v-else>{{user.username}}</span>
							</q-item-section>
						</q-item>
					</q-list>
				</q-list>
			</template>
			
		</q-splitter>
	</q-drawer>
	<router-view :key="$route.fullPath" :isReviewing="isReviewing" :isEditing="isEditing" :isApproved="isApproved" :isReadyForReview="isReadyForReview" @toggleApproval="toggleApproval" @toggleAskReview="toggleAskReview" :fullyApproved="fullyApproved"/>
	</div>
</template>

<script>
import { Notify } from 'quasar';

import AuditService from '@/services/audit';
import UserService from '@/services/user';
import DataService from '@/services/data';
import ConfigsService from '@/services/configs'
import Utils from '@/services/utils';

export default {
		data () {
				return {
					auditId: "",
					findings: [],
					users: [],
					audit: {findings: {}},
					sections: [],
					splitterRatio: 80,
					loading: true,
					vulnCategories: [],
					customFields: [],
					auditTypes: [],
					isReviewing: false,
					isEditing: false,
					isApproved: false,
					isReadyForReview: false,
					fullyApproved: false,
					// The application's public configs
            		configs: {}
				}
		},

		created: function() {
			this.auditId = this.$route.params.auditId;
			this.getCustomFields();
			this.getAuditTypes();
			this.getAudit(); // Calls getSections				
		},

		destroyed: function() {
			if (!this.loading) {
				this.$socket.emit('leave', {username: UserService.user.username, room: this.auditId});
				this.$socket.off()
			}
		},

		computed: {
			generalUsers: function() {return this.users.filter(user => user.menu === 'general')},
			networkUsers: function() {return this.users.filter(user => user.menu === 'network')},
			findingUsers: function() {return this.users.filter(user => user.menu === 'editFinding')},
			sectionUsers: function() {return this.users.filter(user => user.menu === 'editSection')},

			findingList: function() { // Group findings by category
				return _.chain(this.audit.findings)
				.groupBy("category")
				.map((value, key) => {
					if (key === 'undefined')
						return { category: 'No Category', findings: value }
					else
						return {category: key, findings: value}
				})
				.value()
			},

			currentAuditType: function() {
				return this.auditTypes.find(e => e.name === this.audit.auditType)
			}
		},

		methods: {
			toggleApproval: function() {
				this.isApproved = !this.isApproved;
			},
			toggleAskReview: function() {
				this.isReadyForReview = !this.isReadyForReview;
			},

			getFindingColor: function(finding) {
				if (finding.cvssSeverity && finding.cvssSeverity !== "None") {
					if (finding.cvssSeverity === "Low") return "green"
					if (finding.cvssSeverity === "Medium") return "orange"
					if (finding.cvssSeverity === "High") return "red"
					if (finding.cvssSeverity === "Critical") return "black"
				}
				else if (finding.priority) {
					if (finding.priority === 1) return "green"
					if (finding.priority === 2) return "orange"
					if (finding.priority === 3) return "red"
					if (finding.priority === 4) return "black"
				}
				return "light-blue";
			},

			// Sockets handle
			handleSocket: function() {
				this.$socket.emit('join', {username: UserService.user.username, room: this.auditId});
				this.$socket.on('roomUsers', (users) => {
					var userIndex = 0;
					this.users = users.map((user,index) => {
						if (user.username === UserService.user.username) {
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
				})
			},
			// Tells the UI if the user is supposed to be reviewing the audit
			isUserReviewing: function() {
				var isAuthor = this.audit.creator._id === UserService.user.id;
				var isCollaborator = this.audit.collaborators.some((element) => element._id === UserService.user.id);
				var isReviewer = this.audit.reviewers.some((element) => element._id === UserService.user.id);
				var hasReviewAll = UserService.isAllowed('audits:review-all');
				this.isReviewing = !(isAuthor || isCollaborator) && (isReviewer || hasReviewAll);
			},

			// Tells the UI if the user is supposed to be editing the audit
			isUserEditing: function() {
				var isAuthor = this.audit.creator._id === UserService.user.id;
				var isCollaborator = this.audit.collaborators.some((element) => element._id === UserService.user.id);
				var hasUpdateAll = UserService.isAllowed('audits:update-all');
				this.isEditing = isAuthor || isCollaborator || hasUpdateAll;
			},

			getAudit: function() {
				AuditService.getAudit(this.auditId)
				.then((data) => {
					this.audit = data.data.datas
					this.isUserReviewing();
					this.isUserEditing();
					this.isReadyForReview = this.audit.isReadyForReview;
					this.isApproved = this.audit.approvals.some((element) => element._id === UserService.user.id);
					this.getPublicConfigs();
					this.getSections()
					if (this.loading)
						this.handleSocket()
					this.loading = false
				})
				.catch((err) => {
					if (err.response.status === 403)
						this.$router.push({name: '403', params: {error: err.response.data.datas}})
					else if (err.response.status === 404)
						this.$router.push({name: '404', params: {error: err.response.data.datas}})
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
				AuditService.generateAuditReport(this.auditId)
				.then(response => {
					var blob = new Blob([response.data], {type: "application/octet-stream"});
					var link = document.createElement('a');
					link.href = window.URL.createObjectURL(blob);
					link.download = response.headers['content-disposition'].split('"')[1];
					document.body.appendChild(link);
					link.click();
					link.remove();
				})
				.catch( async err => {
					var message = "Error generating template"
					if (err.response && err.response.data) {
						var blob = new Blob([err.response.data], {type: "application/json"})
						var blobData = await this.BlobReader(blob)
						message = JSON.parse(blobData).datas
					}
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

			isAuditFullyApproved: function() {
				this.fullyApproved = this.audit.approvals.length >= this.configs.minReviewers;
        	},

			getPublicConfigs: function() {
				ConfigsService.getPublicConfigs()
				.then((data) => {
					this.configs = data.data.datas;
					this.isAuditFullyApproved();
				})
				.catch((err) => {
					console.log(err);
				});
			},
		}
}
</script>

<style lang="stylus">
.edit-container {
		margin-top: 50px;
		/*margin-left: 0px; Cancel q-col-gutter-md for left*/
		/*margin-right: 16px; Cancel q-col-gutter-md for right*/
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
	// left: 0!important;
	// height: 30%;
	background-color: white;
	color: black;
	font-size: 12px;
}

.edit-drawer {
	// height: 70%;

}
</style>