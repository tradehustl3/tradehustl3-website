import type { GeneratedResume } from '../../worker/resume-documents';
export const sampleResume: GeneratedResume = {
  basics: { fullName: 'Marcus Reed', targetTitle: 'HVAC Lead Technician', location: 'Atlanta, GA', phone: '(555) 010-0142', email: 'marcus.reed@example.com' },
  summary: 'HVAC technician with 8 years of commercial and residential service experience. Diagnoses and repairs rooftop units, split systems, chillers, and boilers, and leads preventive maintenance. Holds EPA 608 Universal and OSHA 30.',
  skills: ['Commercial RTU service', 'Chiller & boiler maintenance', 'Refrigerant recovery', 'Electrical troubleshooting', 'Preventive maintenance', 'BAS / controls', 'Brazing & soldering', 'Work order systems', 'Ductwork repair'],
  certifications: [{ name: 'EPA 608 Universal' }, { name: 'OSHA 30' }, { name: 'NATE Core' }],
  experience: [
    { jobTitle: 'Lead HVAC Technician', employer: 'Ridgeway Mechanical', location: 'Atlanta, GA', startDate: 'Mar 2021', endDate: 'Present', scope: 'two-person service crew · commercial accounts', bullets: ['Diagnose and repair rooftop units, split systems, and chillers across commercial accounts.', 'Lead a two-person crew on scheduled preventive maintenance routes.', 'Train apprentices on refrigerant handling, brazing, and lockout/tagout.', 'Close work orders in the service app with parts, readings, and next steps.'] },
    { jobTitle: 'HVAC Service Technician', employer: 'Brightline Comfort Services', location: 'Marietta, GA', startDate: 'Jun 2017', endDate: 'Feb 2021', bullets: ['Installed and serviced residential heat pumps, furnaces, and thermostats.', 'Performed refrigerant recovery and charging to manufacturer specifications.', 'Explained repair options to homeowners and documented approvals.'] },
  ],
  education: [{ credential: 'HVAC Technology Diploma', institution: 'Atlanta Technical College', location: 'Atlanta, GA', year: '2017' }], additionalInformation: [],
};
