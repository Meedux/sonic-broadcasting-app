import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

const Card = ({children, style, onPress, ...props}) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      {...props}>
      {children}
    </CardComponent>
  );
};

const CardHeader = ({children, style}) => (
  <View style={[styles.header, style]}>
    {children}
  </View>
);

const CardTitle = ({children, style}) => (
  <Text style={[styles.title, style]}>
    {children}
  </Text>
);

const CardContent = ({children, style}) => (
  <View style={[styles.content, style]}>
    {children}
  </View>
);

const CardDescription = ({children, style}) => (
  <Text style={[styles.description, style]}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

export {Card, CardHeader, CardTitle, CardContent, CardDescription};