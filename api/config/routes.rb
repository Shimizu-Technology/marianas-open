Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resource :organization, only: [:show]
      resources :events, only: [:index, :show], param: :slug
      resources :sponsors, only: [:index]
      resources :competitors, only: [:index, :show]
      resources :videos, only: [:index, :show]
      resources :site_contents, only: [:index], path: 'site-contents'
      resources :site_images, only: [:index], path: 'site-images'

      # Auth
      get :me, to: "users#me"

      # Admin
      namespace :admin do
        resources :users
        resources :events do
          member do
            post :upload_image
          end
        end
        resources :videos
        resources :sponsors do
          member do
            post :upload_logo
          end
        end
        resources :competitors do
          member do
            post :upload_photo
          end
        end
        resources :site_contents, path: 'site-contents'
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
