import { useEffect } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePushNotifications() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user || Capacitor.getPlatform() === 'web') return;

        const registerPush = async () => {
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.log('User denied push notification permissions');
                return;
            }

            // IMPORTANT: Calling register() without google-services.json in android/app 
            // will cause a fatal native crash on Android. 
            // Uncomment the line below ONLY after adding your Firebase google-services.json file.
            await PushNotifications.register();
        };

        registerPush();

        // Listeners
        PushNotifications.addListener('registration', async (token: Token) => {
            console.log('Push registration success, token: ' + token.value);

            // Save token to profile or a new table
            // To simplify, let's assume we can save it to the profile's row directly
            // if not, we can insert into a `push_tokens` table.
            // Since we don't know the exact schema, we recommend a generic push_tokens table or adding a column.
            // For now we log it. In a real setup, store it in db:
            // @ts-ignore
            const { error } = await supabase.from('profiles').update({
                push_token: token.value
            }).eq('id', user.id);

            if (error) {
                console.warn("Could not save push token to profile. Make sure the 'push_token' column exists.", error);
            }
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log('Push received: ' + JSON.stringify(notification));
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
            console.log('Push action performed: ' + JSON.stringify(notification));
        });

        return () => {
            PushNotifications.removeAllListeners();
        };
    }, [user]);
}
