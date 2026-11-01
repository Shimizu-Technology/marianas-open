import type { Academy, Competitor } from '../../services/api'

export const academyFixture = (id = 2, name = 'Target Gym'): Academy => ({
  id, name, slug: `gym-${id}`, country_code: 'GU', location: 'Guam', website_url: null,
  instagram_url: null, facebook_url: null, description: null, aliases: [], logo_url: null,
  total_points: 20, gold: 1, silver: 0, bronze: 0, athletes: 3, events_competed: 1,
  results_count: 7, parent_id: null, unaffiliated: false,
})
export const competitorFixture = (id = 2, full_name = 'Target Athlete'): Competitor => ({
  id, full_name, first_name: full_name.split(' ')[0], last_name: full_name.split(' ').slice(1).join(' '),
  nickname: null, country_code: 'GU', belt_rank: 'blue', weight_class: null, academy: 'Target Gym',
  academy_id: 2, bio: null, instagram_url: null, youtube_url: null, wins: 0, losses: 0, draws: 0,
  gold_medals: 1, silver_medals: 0, bronze_medals: 0, total_points: 20, events_competed: 1,
  results_count: 7, photo_url: null,
})
export const listResponse = { total: 1, page: 1, per_page: 20 }
