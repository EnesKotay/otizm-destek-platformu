package com.autismsupport.platform.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {

    private final String cacheKeyPrefix;

    public CacheConfig(@Value("${app.cache.redis.key-prefix:autism-support}") String cacheKeyPrefix) {
        this.cacheKeyPrefix = normalizePrefix(cacheKeyPrefix);
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        var keySerializer = RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer());
        var valueSerializer = RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer());

        var defaults = RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(cacheName -> cacheKeyPrefix + ":" + cacheName + "::")
                .serializeKeysWith(keySerializer)
                .serializeValuesWith(valueSerializer)
                .disableCachingNullValues();

        var similarFamiliesConfig = defaults.entryTtl(Duration.ofHours(1));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults.entryTtl(Duration.ofMinutes(10)))
                .withInitialCacheConfigurations(Map.of(
                        "similar-families", similarFamiliesConfig
                ))
                .transactionAware()
                .build();
    }

    private static String normalizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return "autism-support";
        }
        return prefix.trim().replaceAll(":+$", "");
    }
}
