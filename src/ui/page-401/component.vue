<template>
  <main class="page-401">
    <span class="particle" v-for="item in particles(4)" :key="item.id" :style="item.style">{{ item.text }}</span>
    <span class="particle" v-for="item in particles(0)" :key="item.id" :style="item.style">{{ item.text }}</span>
    <span class="particle" v-for="item in particles(1)" :key="item.id" :style="item.style">{{ item.text }}</span>
    <article class="content">
      <p>OOPS!</p>
      <p><strong>401</strong> 权限不足。</p>
      <p>
        <el-link @click="backToHome">{{ $t('login.back-to-home') }}</el-link>
      </p>
    </article>
  </main>
</template>
<script lang="ts" src="./component.ts" />
<style lang="scss" src="./component.scss" />
