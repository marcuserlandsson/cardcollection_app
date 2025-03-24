import { View, StyleSheet, FlatList, Image, Text, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

const cardSets = [
    { id: 'BT20', title: 'BT20 - OVER THE X', image: require('../../assets/images/expansions/bt20.png') },
    { id: 'BT19', title: 'BT19 - XROS EVOLUTION', image: require('../../assets/images/expansions/bt19.png') },
    // Add more card sets
];

interface CardSet {
    id: string;
    title: string;
    image: any; 
}

export default function DatabaseScreen() {
    const router = useRouter();

    const handleSetPress = (setId: string, setTitle: string) => {
        router.push({
            pathname: '/(tabs)/cardList',
            params: { setId, setTitle }
        });
    };

    const renderItem = ({ item }: { item: CardSet }) => (
        <Pressable 
            style={styles.cardSet}
            onPress={() => handleSetPress(item.id, item.title)}
        >
            <Image 
                source={item.image} 
                style={styles.cardImage}
            />
            <Text style={styles.cardTitle}>{item.title}</Text>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={cardSets}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
            />
        </View>
    );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; 

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        padding: 16,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardSet: {
        width: cardWidth,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#666',
    },
    cardImage: {
        width: '100%',
        height: cardWidth, 
        resizeMode: 'cover',
    },
    cardTitle: {
        color: '#fff',
        padding: 10,
        fontSize: 14,
        textAlign: 'center',
    }
});