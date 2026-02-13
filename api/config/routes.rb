Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resource :organization, only: [:show]
      resources :events, only: [:index, :show], param: :slug
      resources :sponsors, only: [:index]

      # Auth
      get :me, to: "users#me"

      # Admin
      namespace :admin do
        resources :users
      end
    end
  end

  get '/health', to: proc { [200, {}, ['ok']] }
end
