import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';

type Params = {
    cardNumber: string;
}

interface CardDetail {
    name: string;
    type: string;
    id: string;
    level: string;
    color: string;
    dp: string;
    play_cost: string;
    evolution_cost: string;
    main_effect: string;
}

// Rate limiter implementation
const rateLimiter = {
    tokens: 15, // Maximum number of tokens
    lastRefill: Date.now(),
    refillRate: 10000, // 10 seconds in milliseconds
    
    async getToken(): Promise<boolean> {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        
        // Refill tokens if enough time has passed
        if (timePassed >= this.refillRate) {
            this.tokens = 15;
            this.lastRefill = now;
        }
        
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        
        // Wait until next refill if no tokens available
        const waitTime = this.refillRate - timePassed;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.getToken();
    }
};

// Fetch card details using the Digimon Card API with rate limiting
async function fetchCardDetails(cardNumber: string) {
    try {
        await rateLimiter.getToken();
        const response = await fetch(`https://digimoncard.io/api-public/search.php?card=${cardNumber}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching card details:', error);
        throw error;
    }
}

export default function CardDetailsScreen() {
    const { cardNumber } = useLocalSearchParams<Params>();
    const [cardDetails, setCardDetails] = useState<CardDetail[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCardDetails() {
            try {
                const details = await fetchCardDetails(cardNumber);
                setCardDetails(details);
            } catch (error) {
                console.error('Error loading card details:', error);
            } finally {
                setLoading(false);
            }
        }

        loadCardDetails();
    }, [cardNumber]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={{ color: '#fff' }}>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Image
                source={{ uri: `https://images.digimoncard.io/images/cards/${cardNumber}.jpg` }}
                style={styles.cardImage}
            />
            {cardDetails && cardDetails[0] && (
                <View style={styles.detailsContainer}>
                    <Text style={styles.cardName}>{cardDetails[0].name}</Text>
                    <Text style={styles.cardText}>Type: {cardDetails[0].type}</Text>
                    <Text style={styles.cardText}>Card Number: {cardDetails[0].id}</Text>
                    <Text style={styles.cardText}>Level: {cardDetails[0].level}</Text>
                    <Text style={styles.cardText}>Color: {cardDetails[0].color}</Text>
                    <Text style={styles.cardText}>DP: {cardDetails[0].dp}</Text>
                    <Text style={styles.cardText}>Play Cost: {cardDetails[0].play_cost}</Text>
                    <Text style={styles.cardText}>Evolution Cost: {cardDetails[0].evolution_cost}</Text>
                    <Text style={styles.cardText}>Effect: {cardDetails[0].main_effect}</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
    },
    contentContainer: {
        padding: 16,
        alignItems: 'center',
    },
    cardImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 63/88,
        resizeMode: 'contain',
    },
    detailsContainer: {
        marginTop: 20,
        width: '100%',
        padding: 10,
    },
    cardName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    cardText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 5,
    },
});