# TCG Card Collection App
App for keeping track of trading cards and storing card information. Planned features include:
 - Database with all availible cards to collect
 - Search function to filter or search by name, card number, typ etc.
 - Collections tab, to show cards and amount collected
 - Add new card to collection by searching for it in the database or scanning it with your phone
 - Build decks, show what cards you do not yet own

# Tools
 - Mobile App Framework - React Native
   - React Navigation, React Native Elements, Expo
 - State Management - Redux
 - Backend Server - Supabase
 - API - Digimon Card API
 - Development Tools - Android Studio, Expo Go

# Updating the database
 - Run fetch_cards_from_api.py to update the database with the latest cards
 - Fetches from the Digimon Card API and caches the data in Supabase
 - This is done in batches of 15 cards to avoid rate limiting
