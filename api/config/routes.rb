Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resource :organization, only: [:show]
      resources :events, only: [:index, :show], param: :slug do
        resources :event_results, only: [:index], path: 'results'
        get 'results/summary', to: 'event_results#summary'
        get 'gallery', to: 'event_gallery_images#index'
      end
      resources :sponsors, only: [:index]
      resources :sponsor_placements, only: [:index]
      resources :competitors, only: [:index, :show]
      resources :academies, only: [:index, :show]
      resources :videos, only: [:index, :show]
      resources :announcements, only: [:index]
      resources :site_contents, only: [:index], path: 'site-contents'
      resources :site_images, only: [:index], path: 'site-images'
      get 'rankings/competitor', to: 'rankings#competitor'
      get 'rankings', to: 'official_rankings#lists'
      get 'rankings/lists', to: 'official_rankings#lists'
      get 'rankings/lists/:id/divisions', to: 'official_rankings#divisions'
      get 'rankings/lists/:id/entries', to: 'official_rankings#entries'
      get 'rankings/standings', to: 'official_rankings#standings'
      get 'impact', to: 'impact#index'
      get 'impact/status', to: 'impact#status'

      # Auth
      get :me, to: "users#me"

      namespace :internal do
        get "asjjf/work", to: "asjjf#work"
        post "asjjf/snapshots/:id/apply_ranking", to: "asjjf#apply_ranking"
        post "asjjf/snapshots", to: "asjjf#snapshots"
        post "asjjf/heartbeat", to: "asjjf#heartbeat"
      end

      # Admin
      namespace :admin do
        get "attention", to: "attention#index"
        get "asjjf/ranking_holds", to: "asjjf#ranking_holds"
        get "asjjf/snapshots/:id", to: "asjjf#snapshot"
        get "asjjf/status", to: "asjjf#status"
        get "asjjf/ranking_seasons", to: "asjjf#ranking_seasons"
        put "asjjf/ranking_seasons/:season_year", to: "asjjf#update_ranking_season"
        post "asjjf/snapshots/:id/apply_ranking", to: "asjjf#apply_ranking"
        post "asjjf/snapshots", to: "asjjf#snapshots"
        post "asjjf/close_breaker", to: "asjjf#close_breaker"
        post "events/:id/asjjf_check", to: "asjjf#check"
        resources :users do
          member do
            post :resend_invitation
          end
        end
        resources :events do
          collection { post :rollover }
          member do
            post :publish
            post :unpublish
            post :fill_asjjf
            post :upload_image
            post :upload_poster
            delete :remove_poster
            post :upload_ticket_banner
            delete :remove_ticket_banner
            get :import_results_preview
            post :import_results
            post :retranslate
            post :clone
          end
          get 'results_sync', to: 'results_sync_runs#show'
          post 'results_sync/preview', to: 'results_sync_runs#preview'
          post 'results_sync/:run_id/approve', to: 'results_sync_runs#approve'
          post 'results_sync/:run_id/discard', to: 'results_sync_runs#discard'
          resources :event_results, only: [:index, :create, :update, :destroy], path: 'results' do
            collection do
              post :bulk_create
              delete :destroy_all
            end
          end
          resources :event_accommodations, only: [:index, :create, :update, :destroy], path: 'accommodations' do
            member do
              post :upload
            end
          end
          resources :event_gallery_images, only: [:index, :create, :update, :destroy], path: 'gallery-images' do
            collection do
              get :upload_policy
              post :prepare_direct_upload
              post :complete_direct_upload
              patch :bulk_update
              delete :bulk_destroy
            end
            member do
              post :upload
            end
          end
          resources :event_gallery_albums, only: [ :index, :create, :update ], path: 'gallery-albums' do
            patch :settings, on: :collection
          end
          resources :event_gallery_imports, only: [ :index, :create ], path: 'gallery-imports' do
            post :prepare_direct_upload, on: :collection
          end
          resources :event_gallery_day_proposals, only: [ :index, :create ], path: 'gallery-day-proposals'
          resources :event_gallery_upload_batches, only: [:index, :show, :create, :update, :destroy], path: 'gallery-upload-batches'
        end
        resources :videos do
          post :check_availability, on: :member
        end
        resources :sponsors do
          member do
            post :upload_logo
          end
        end
        resources :identity_reviews, only: [:index] do
          post :resolve, on: :member
        end
        resources :competitors do
          member do
            get :merge_preview
            post :merge
            post :upload_photo
          end
        end
        resources :academies, only: [:index, :show, :update, :destroy] do
          member do
            get :merge_preview
            post :merge
            post :upload_logo
          end
        end
        resources :announcements do
          member do
            post :upload_image
            delete :remove_image
          end
        end
        resources :impact_metrics, path: 'impact-metrics' do
          collection do
            post :reorder
          end
        end
        resources :fund_allocations, path: 'fund-allocations' do
          collection do
            post :reorder
          end
        end
        resource :impact_configuration, path: 'impact-configuration', only: [:show, :update]
        resources :site_contents, path: 'site-contents' do
          member do
            post :retranslate
          end
        end
        resources :site_images, path: 'site-images' do
          member do
            post :upload
          end
        end
        resource :organization, only: [:show, :update] do
          post :upload_logo, on: :collection
          post :upload_banner, on: :collection
        end
      end
    end
  end

  get '/health', to: proc { [200, {}, ['ok']] }
end
