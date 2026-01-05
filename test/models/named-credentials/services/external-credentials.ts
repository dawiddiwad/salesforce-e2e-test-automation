import { SalesforceService } from '../../../../src/models/services/salesforce-service'
import { Record } from 'jsforce'
import { step } from '../../../runners/custom-test-runner'

export type Credential = {
	name: string
	principal: Principal
}

export type Principal = {
	name: string
	clientId: string
	clientSecret: string
}

const TestAPIConnectionSoql = `
    SELECT PackageNamespace__AccessKey__c, PackageNamespace__SecretKey__c 
    FROM PackageNamespace__ProtectedEndpoint__c 
    WHERE Name = 'TestAPI'
`

const setNamedPrincipalApex = (credential: Credential) => `
    try {        
        ConnectApi.CredentialInput input = new ConnectApi.CredentialInput();
        input.authenticationProtocol = ConnectApi.CredentialAuthenticationProtocol.OAUTH;
        input.authenticationProtocolVariant = ConnectApi.CredentialAuthenticationProtocolVariant.CLIENTCREDENTIALSCLIENTSECRETBASIC;
        input.externalCredential = '${credential.name}';
        input.principalName = '${credential.principal.name}';
        input.principalType = ConnectApi.CredentialPrincipalType.NAMEDPRINCIPAL;
        input.credentials = new Map<String, ConnectApi.CredentialValueInput>();

        ConnectApi.CredentialValueInput clientId = new ConnectApi.CredentialValueInput();
        clientId.encrypted = false;
        clientId.value = '${credential.principal.clientId}';
        input.credentials.put('clientId', clientId);

        ConnectApi.CredentialValueInput clientSecret = new ConnectApi.CredentialValueInput();
        clientSecret.encrypted = true;
        clientSecret.value = '${credential.principal.clientSecret}';
        input.credentials.put('clientSecret', clientSecret);

        ConnectApi.Credential credential;
        try {
            credential = ConnectApi.NamedCredentials.getCredential('${credential.name}', '${credential.principal.name}', ConnectApi.CredentialPrincipalType.NAMEDPRINCIPAL);
        } catch (Exception e) {
            e.setMessage('failed to find credential ${credential.name} with principal ${credential.principal.name} due to: ' + e.getMessage());
            throw e;
        }

        ConnectApi.CredentialValue existingClientId = credential.credentials.get('clientId');
        ConnectApi.CredentialValue existingClientSecret = credential.credentials.get('clientSecret');
        if (existingClientId == null && existingClientSecret == null) {
            ConnectApi.NamedCredentials.createCredential(input);
        } else {
            ConnectApi.NamedCredentials.updateCredential(input);
        }

    } catch (Exception e) {
        e.setMessage('failed to update credential ${credential.name} due to: ' + e.getMessage());
        throw e;
    }
`

export class ExternalCredentialsService extends SalesforceService {
	@step
	private async getTestAPIConnection() {
		try {
			const connection = await this.api
				.query(TestAPIConnectionSoql)
				.then((result) => (result.records as Record[])[0])
			return {
				accessKey: connection.PackageNamespace__AccessKey__c,
				secretKey: connection.PackageNamespace__SecretKey__c,
			}
		} catch (error) {
			throw new Error(`failed to get TestAPI connection config due to:\n${error}`)
		}
	}

	@step
	private async setPrincipal(credential: Credential) {
		try {
			await this.api.executeApex(setNamedPrincipalApex(credential))
		} catch (error) {
			throw new Error(
				`failed to set principal ${credential.principal.name} for credential ${credential.name} due to:\n${error}`
			)
		}
	}

	@step
	async setupEmailCourier() {
		try {
			const TestAPI = await this.getTestAPIConnection()
			if (!TestAPI.accessKey || !TestAPI.secretKey)
				throw new Error('TestAPI connection config is missing access or secret keys')
			const courierCredential = {
				name: 'PackageNamespace__KeycloaTAoken',
				principal: {
					name: 'CourierPrincipal',
					clientId: TestAPI.accessKey,
					clientSecret: TestAPI.secretKey,
				},
			}
			await this.setPrincipal(courierCredential)
		} catch (error) {
			throw new Error(`failed to setup Email Courier due to:\n${error}`)
		}
	}
}
