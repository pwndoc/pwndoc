<template>
    <div class="row">
        <div class="col-xl-8 col-12 offset-xl-2 q-pa-md">
            <q-card>
                <q-card-section class="q-py-xs bg-blue-grey-5 text-white">
                    <div class="text-h6">{{$t('updateUserInformation')}}</div>
                </q-card-section>
                <q-separator />
                <q-card-section class="row">
                    <q-list class="col-md-6 col-12">
                        <q-item>
                            <q-item-section side>{{$t('role')}}</q-item-section>
                            <q-item-section side>
                                <q-chip square :label="user.role" class="text-white" :color="(user.role === 'admin')?'orange':'info'" />
                            </q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>
                                <q-input 
                                v-model="user.username" 
                                :label="$t('username')" 
                                stack-label 
                                :error="!!errors.username"
                                :error-message="errors.username" 
                                outlined                                
                                />
                            </q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>
                                <q-input 
                                v-model="user.firstname" 
                                :label="$t('firstname')" 
                                stack-label
                                :error="!!errors.firstname"
                                :error-message="errors.firstname"
                                outlined                                
                                />
                            </q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>
                                <q-input 
                                v-model="user.lastname" 
                                :label="$t('lastname')" 
                                stack-label 
                                :error="!!errors.lastname"
                                :error-message="errors.lastname"
                                outlined                                
                                />
                            </q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>
                                <q-input 
                                v-model="user.email" 
                                label="Email" 
                                stack-label 
                                outlined
                                />
                            </q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>
                                <q-input 
                                v-model="user.phone" 
                                label="Phone" 
                                stack-label 
                                outlined
                                />
                            </q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>
                                <q-field borderless :error="!!errors.newPassword" :error-message="errors.newPassword">
                                    <q-input 
                                    ref="pwdUpdateRef"
                                    class="col-md-6 col-6 q-pr-sm" 
                                    v-model="user.newPassword" 
                                    :label="$t('newPassword')" 
                                    stack-label 
                                    type="password"
                                    clearable
                                    outlined
                                    />
                                    <q-input 
                                    class="col-md-6 col-6 q-pl-sm" 
                                    v-model="user.confirmPassword" 
                                    :label="$t('confirmPassword')" 
                                    stack-label 
                                    type="password"
                                    outlined                                    
                                    clearable
                                    />
                                </q-field>
                            </q-item-section>
                        </q-item>
                        <q-item>
                            <q-item-section>
                                <q-input 
                                v-model="user.currentPassword" 
                                :label="$t('currentPassword')" 
                                stack-label 
                                type="password"
                                :error="!!errors.currentPassword" 
                                :error-message="errors.currentPassword"
                                @keyup.enter="updateProfile"
                                outlined                                
                                >
                                    <template v-slot:append>
                                        <q-btn :label="$t('btn.update')" unelevated color="secondary" @click="updateProfile" />
                                    </template>
                                </q-input>
                            </q-item-section>
                        </q-item>
                    </q-list>
                    <q-list class="col-md-6 col-12">
                        <q-item>
                            <q-item-section>
                                <q-toggle 
                                v-model="totpEnabled" 
                                label="Two-factor authentication"
                                @update:model-value="getTotpQrcode" 
                                />
                            </q-item-section>
                        </q-item>

                        <!-- Setup TOTP -->
                        <template v-if="totpEnabled && !user.totpEnabled">
                            <q-item>
                                <q-item-section class="text-grey-7">
                                    Each time you log in, you will need to use an additionnal code generated by an authenticator application.
                                    <ol>
                                        <li>
                                            Install an Authenticator App from your phone's store.
                                        </li>
                                        <li>
                                            Open the Authenticator App.
                                        </li>
                                        <li>
                                            Tap the Add icon or the Begin Setup button.
                                        </li>
                                        <li>
                                            Choose Scan a Barcode, and scan using your phone.
                                        </li>
                                        <li>
                                            Enter the generated token below to check and enable TOTP.
                                        </li>
                                    </ol>
                                </q-item-section>
                                <q-item-section class="col-4">
                                    <q-img :src="totpQrcode" width="200px" height="200px" />
                                </q-item-section>
                            </q-item>

                            <q-item v-if="totpEnabled && !user.totpEnabled">
                                <q-item-section>
                                    <q-input 
                                    ref="totpEnableInput"
                                    v-model="totpToken" 
                                    label="TOTP Token" 
                                    stack-label 
                                    maxlength="6"
                                    placeholder="Enter 6-digit code"
                                    @keyup.enter="setupTotp"
                                    outlined
                                    >
                                        <template v-slot:append>
                                            <q-btn label="Enable" unelevated color="secondary" @click="setupTotp" />
                                        </template>
                                    </q-input>
                                </q-item-section>
                            </q-item>
                        </template>
                        
                        <q-item v-if="totpEnabled && user.totpEnabled">
                            <q-item-section>
                                Your account is currently protected by 2 factor authentication.
                            </q-item-section>
                        </q-item>

                        <!-- Cancel TOTP -->
                        <template v-if="!totpEnabled && user.totpEnabled">
                            <q-item>
                                <q-item-section class="text-grey-7">
                                    This action will disable the second authentication factor.
                                </q-item-section>
                            </q-item>
                            <q-item>
                                <q-item-section>
                                    <q-input 
                                    ref="totpDisableInput"
                                    v-model="totpToken" 
                                    label="TOTP Token" 
                                    stack-label 
                                    maxlength="6"
                                    placeholder="Enter 6-digit code"
                                    @keyup.enter="cancelTotp"
                                    outlined
                                    >
                                        <template v-slot:append>
                                            <q-btn label="Disable" unelevated color="negative" @click="cancelTotp" />
                                        </template>
                                    </q-input>
                                </q-item-section>
                            </q-item>
                        </template>
                    </q-list>
                </q-card-section>
            </q-card>
        </div>
    </div>
</template>

<script src='./profile.js'></script>

<style></style>