import { faker } from '@faker-js/faker'
import { Record } from 'jsforce'
import { CompareMap, CompareMapRecords } from '../../../../src/api/salesforce/record-comparator'
import { SalesforceId } from '../../../../src/models/types'
import { GeneralNamingPolicy } from '../../../policies/general'

export const fake = {
	itineraryRecords: () => {
		const records = {
			contactName: 'Abi Tester',
			accountName: 'Test Household',
			firstPassenger: {
				firstName: GeneralNamingPolicy.uniqueName(),
				lastName: GeneralNamingPolicy.uniqueName(),
				fullName: () => `${records.firstPassenger.firstName} ${records.firstPassenger.lastName}`,
				dateOfBirth: Intl.DateTimeFormat('en-GB').format(faker.date.past({ years: 50 })),
			},
			secondPassenger: {
				firstName: GeneralNamingPolicy.uniqueName(),
				lastName: GeneralNamingPolicy.uniqueName(),
				fullName: () => `${records.secondPassenger.firstName} ${records.secondPassenger.lastName}`,
				dateOfBirth: Intl.DateTimeFormat('en-GB').format(faker.date.past({ years: 50 })),
			},
			primaryRecords: {} as CompareMapRecords,
			amendmentRecords: {} as CompareMapRecords,
		}
		return records
	},
	packageSearchRecords: () => {
		const records = {
			account: {} as Record,
			itineraryId: '' as SalesforceId,
			primaryPassenger: {} as Record,
			secondPassenger: {} as Record,
			thirdPassenger: {} as Record,
			fourthPassenger: {} as Record,
			accountName: GeneralNamingPolicy.uniqueName(),
			passengerName: (number: number) => `Passenger ${number} on ${records.accountName}`,
			flowAssignments: {
				PassengerToContact: 'Passenger_To_Contact_Flow',
				ContactToPassenger: 'Contact_to_Passenger_Flow_in_memory_flow',
			},
			permissionSets: {
				pilotFeatures: 'Pilot Features',
			},
			pilotFeatures: ['PackageModification', 'ChangePackageOccupancy'],
		}
		return records
	},
}

export const childRecords: CompareMap = {
	sobject: 'PackageNamespace__Itinerary__c',
	matchCriteria: 'count()',
	child: [
		{
			sobject: 'PackageNamespace__Itinerary_Items__r',
			matchCriteria: { fields: ['PackageNamespace__FullName__c', 'PackageNamespace__Order__c'] },
			fieldFilter: {
				type: 'filter',
				fields: [
					'CreatedDate',
					'Id',
					'PackageNamespace__Booking_No__c',
					'PackageNamespace__CustomUOM__c',
					'PackageNamespace__ItineraryBooking__c',
					'PackageNamespace__ItinerarySubBreakdownGroup__c',
					'PackageNamespace__Itinerary__c',
					'PackageNamespace__OriginalId__c',
					'PackageNamespace__Supplier_Comments__c',
					'LastModifiedDate',
					'Name',
					'SystemModstamp',
					'attributes',
				],
			},
			child: [
				{
					sobject: 'Notes',
					matchCriteria: 'count()',
				},
				{
					sobject: 'PackageNamespace__ItineraryPriceLines__r',
					matchCriteria: 'count()',
				},
				{
					sobject: 'PackageNamespace__Itinerary_Flight_Legs__r',
					matchCriteria: 'count()',
				},
			],
		},
		{
			sobject: 'PackageNamespace__Passengers__r',
			matchCriteria: { fields: ['PackageNamespace__LastName__c'] },
			fieldFilter: {
				type: 'filter',
				fields: [
					'CreatedDate',
					'Id',
					'PackageNamespace__ItineraryGroup__c',
					'PackageNamespace__Itinerary__c',
					'PackageNamespace__OriginalId__c',
					'LastModifiedDate',
					'Name',
					'SystemModstamp',
					'attributes',
				],
			},
			child: [
				{
					sobject: 'PackageNamespace__PassengerItineraryUnitAssignments__r',
					matchCriteria: 'count()',
				},
			],
		},
		{
			sobject: 'PackageNamespace__ItineraryMasterBreakdownGroups__r',
			matchCriteria: { fields: ['Name'] },
			fieldFilter: {
				type: 'filter',
				fields: [
					'CreatedDate',
					'Id',
					'PackageNamespace__Itinerary__c',
					'PackageNamespace__OriginalId__c',
					'LastModifiedDate',
					'SystemModstamp',
					'attributes',
				],
			},
			child: [
				{
					sobject: 'PackageNamespace__ItinerarySubBreakdownGroups__r',
					matchCriteria: 'count()',
				},
			],
		},
		{
			sobject: 'PackageNamespace__Itinerary_Group__r',
			matchCriteria: { fields: ['Name'] },
			fieldFilter: {
				type: 'filter',
				fields: [
					'CreatedDate',
					'Id',
					'PackageNamespace__Itinerary__c',
					'PackageNamespace__OriginalId__c',
					'PackageNamespace__PrimaryPassenger__c',
					'LastModifiedDate',
					'SystemModstamp',
					'attributes',
				],
			},
		},
		{
			sobject: 'PackageNamespace__ItineraryLocations__r',
			matchCriteria: { fields: ['PackageNamespace__Location__c'] },
			fieldFilter: {
				type: 'filter',
				fields: [
					'CreatedDate',
					'Id',
					'PackageNamespace__Itinerary__c',
					'LastModifiedDate',
					'Name',
					'SystemModstamp',
					'attributes',
				],
			},
		},
	],
}
