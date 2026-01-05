import { Record } from 'jsforce'
import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { SalesforceId } from '../../../../src/models/types'
import { step } from '../../../runners/custom-test-runner'
import { expect } from '@playwright/test'

export class UserSerivce extends SalesforceService {
	private readonly user = (): SalesforceId => this.api.connection.userInfo?.id as SalesforceId

	private async getPermissionSets(byLabel?: string) {
		try {
			const permissionSets = (await this.api.connection
				.sobject('PermissionSet')
				.find({
					Label: byLabel,
				})
				.run()) as Record[]
			expect(
				permissionSets.length,
				`there should be at least 1 permission set ${byLabel}`
			).toBeGreaterThanOrEqual(1)
			return permissionSets
		} catch (error) {
			throw new Error(`searching for permission sets ${byLabel}\n${error}`)
		}
	}

	private async getPermissionSetAssignments(byLabel?: string) {
		try {
			const permissionSetAssignments = (await this.api.connection
				.sobject('PermissionSetAssignment')
				.find({
					'PermissionSet.Label': byLabel,
					AssigneeId: this.user(),
					IsActive: true,
				})
				.run()) as Record[]
			return permissionSetAssignments
		} catch (error) {
			throw new Error(`searching for permisson set assignments ${byLabel}\n${error}`)
		}
	}

	@step
	async enablePermissionSet(byLabel: string) {
		try {
			const permissionSetAlreadyAssigned = await this.getPermissionSetAssignments(byLabel).then(
				(records) => records.length
			)
			if (permissionSetAlreadyAssigned) return
			const permissionSetAssignment = {
				PermissionSetId: await this.getPermissionSets(byLabel).then((records) => records[0].Id),
				AssigneeId: this.user(),
			}
			await this.api.create('PermissionSetAssignment', permissionSetAssignment)
		} catch (error) {
			throw new Error(`enabling permission set ${byLabel} for user ${this.user()}\n${error}`)
		}
	}

	@step
	async disablePermissionSet(byLabel: string) {
		try {
			const permissionSetAssignments = await this.getPermissionSetAssignments(byLabel)
			const noAssignments = permissionSetAssignments.length === 0
			if (noAssignments) return
			for (const assignment of permissionSetAssignments) {
				await this.api.delete('PermissionSetAssignment', assignment.Id as SalesforceId)
			}
		} catch (error) {
			throw new Error(`disabling permission set ${byLabel} for user ${this.user()}\n${error}`)
		}
	}
}
