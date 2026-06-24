// users.js — Per-user data (agenda, role, etc).
// In a real deployment this would be fetched from a calendar API +
// directory service. Mocked here so the design supports both users.

window.PRTS_USERS = {
  neele: {
    id: 'neele',
    name: 'Dr. Adriaan Neele',
    initials: 'AN',
    role: "President",
    title: 'President',
    short: 'Dr. Neele',
    // Today's agenda — would come from Outlook/Google Cal in production
    agenda: [
      { time: '09:00', label: 'Senior staff stand-up',     detail: 'Weekly · Beeke conference room' },
      { time: '10:30', label: 'Faculty council',           detail: 'Standing item: SIS migration' },
      { time: '13:00', label: 'Lunch w/ K. Soule',          detail: 'Advancement · Q3 outlook' },
      { time: '15:00', label: 'Donor call (NL cohort)',    detail: 'Heritage Reformed delegation' },
      { time: '17:00', label: 'Sermon prep',               detail: 'Sunday text: Psalm 119:130' },
    ],
    // Which views/signal categories this user cares most about
    priorities: ['budget', 'donations', 'grants', 'enrollment'],
  },
  bilkes: {
    id: 'bilkes',
    name: 'Dr. Gerald Bilkes',
    initials: 'GB',
    role: 'Vice President',
    title: 'Vice President',
    short: 'Dr. Bilkes',
    agenda: [
      { time: '08:30', label: 'OT-602 Hebrew Exegesis',    detail: 'Pentateuch · Lecture, room 204' },
      { time: '11:00', label: 'Dissertation defense',      detail: 'PhD candidate: J. Vermeer' },
      { time: '13:30', label: 'Curriculum committee',      detail: 'MDiv core sequence review' },
      { time: '15:00', label: '1:1 with Dr. Kuivenhoven',  detail: 'Reformation history syllabus' },
      { time: '16:30', label: 'Admissions review',         detail: 'Fall \u201926 ThM file 7 of 12' },
    ],
    // Bilkes cares about academic, faculty, enrollment
    priorities: ['enrollment', 'faculty', 'academic'],
  },
};
