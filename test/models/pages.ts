import { FluentInterface } from '../../src/models/types'
import { SalesforcePage } from '../../src/models/pages/salesforce-page'
import { Page } from '@playwright/test'
import { ContactRecordDetailsPage } from './contact/pages/record-details-page'
import { ItineraryBuilderTabPage } from './itinerary/pages/builder/tab-page'
import { ItineraryPassengersTabPage } from './itinerary/pages/passengers/tab-page'
import { ItineraryRecordDetailsPage } from './itinerary/pages/record/record-details-page'
import { ItineraryRecordEditPage } from './itinerary/pages/record/record-edit-page'
import { ItineraryRecordPaymentPage } from './itinerary/pages/payment/tab-page'
import { ItineraryTabPage } from './itinerary/pages/tab/tab-page'
import { NavigatorContextBarPage } from './navigator/pages/context-bar-page'
import { PreStayTabPage } from './package-search/pages/booking-wizard/pre-stay-tab-page'
import { ItineraryCostingsTabPage } from './itinerary/pages/costings/tab-page'
import { OptionsTabPage } from './package-search/pages/booking-wizard/options-tab-page'
import { PassengersTabPage } from './package-search/pages/booking-wizard/passengers-tab-page'
import { PostStayTabPage } from './package-search/pages/booking-wizard/post-stay-tab-page'
import { SelectCabinTabPage } from './package-search/pages/booking-wizard/select-cabin-tab-page'
import { PackageSearchAvailabilityPage } from './package-search/pages/filters/availability-page'
import { PackageSearchFiltersPage } from './package-search/pages/filters/filters-page'
import { TripTabPage } from './trip/pages/tab/tab-page'
import { TripRecordEditPage } from './trip/pages/record/edit-page'
import { TripRecordDetailsPage } from './trip/pages/record/details-page'
import { PackageSearchResultsPage } from './package-search/pages/filters/results-page'
import { ItineraryDocumentsTabPage } from './itinerary/pages/documents/tab-page'
import { ItineraryBookingsTabPage } from './itinerary/pages/bookings/pages/tab-page'
import { ItineraryPaymentsTabPage } from './itinerary/pages/payments/pages/tab-page'

export type SalesforcePages = ReturnType<typeof allSalesforcePages>
export const allSalesforcePages = (page: Page) =>
	({
		contact: {
			record: {
				details: new ContactRecordDetailsPage(page),
			},
		},
		navigator: new NavigatorContextBarPage(page),
		itinerary: {
			tab: new ItineraryTabPage(page),
			record: {
				edit: new ItineraryRecordEditPage(page),
				details: new ItineraryRecordDetailsPage(page),
				payment: new ItineraryRecordPaymentPage(page),
			},
			builder: new ItineraryBuilderTabPage(page),
			costings: new ItineraryCostingsTabPage(page),
			passengers: new ItineraryPassengersTabPage(page),
			documents: new ItineraryDocumentsTabPage(page),
			bookings: new ItineraryBookingsTabPage(page),
			payments: new ItineraryPaymentsTabPage(page),
		},
		packageSearch: {
			filters: new PackageSearchFiltersPage(page),
			results: {
				availabilityTab: new PackageSearchAvailabilityPage(page),
				resultsTab: new PackageSearchResultsPage(page),
			},
			bookingWizzard: {
				passengersTab: new PassengersTabPage(page),
				selectCabinTab: new SelectCabinTabPage(page),
				optionsTab: new OptionsTabPage(page),
				preStayTab: new PreStayTabPage(page),
				postStayTab: new PostStayTabPage(page),
			},
		},
		trip: {
			tab: new TripTabPage(page),
			record: {
				edit: new TripRecordEditPage(page),
				details: new TripRecordDetailsPage(page),
			},
		},
	}) satisfies FluentInterface<SalesforcePage>
