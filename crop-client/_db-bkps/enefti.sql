-- phpMyAdmin SQL Dump
-- version 4.6.5.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 26-06-2017 a las 00:53:56
-- Versión del servidor: 10.1.21-MariaDB
-- Versión de PHP: 5.6.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `enefti`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `crops`
--

CREATE TABLE `crops` (
  `id` int(11) NOT NULL,
  `status` enum('0','1') NOT NULL DEFAULT '1',
  `name` varchar(255) NOT NULL,
  `crop_plan` int(11) NOT NULL,
  `date_vegetation` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_flowering` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `date_harvesting` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

--
-- Volcado de datos para la tabla `crops`
--

INSERT INTO `crops` (`id`, `status`, `name`, `crop_plan`, `date_vegetation`, `date_flowering`, `date_harvesting`) VALUES
(1, '1', 'May 2017', 1, '2017-05-11 22:00:00', '0000-00-00 00:00:00', '0000-00-00 00:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `crop_log`
--

CREATE TABLE `crop_log` (
  `id` int(11) NOT NULL,
  `crop` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `text` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Volcado de datos para la tabla `crop_log`
--

INSERT INTO `crop_log` (`id`, `crop`, `date`, `text`) VALUES
(1, 1, '2017-05-12 22:00:00', 'Introduced clones (coming from soild medium) to the crop. Only 1 400W light active to allow clones addapt to the new enviroment.'),
(2, 1, '2017-05-22 22:00:00', 'Introduced more clones (Amnesia) to the crop. Still single 400W light on.'),
(4, 1, '2017-05-29 22:00:00', 'Detected a bad join in air conditioner pipe, part of the heat was staying inside the room, increasing temperature up tp 33º. Fixed'),
(5, 1, '2017-06-06 22:00:00', 'About 20 germinated seeds have been introduced OG kush, and Shark). Applied Mighty Wash product to clean plants and enviroment of Red Spiders, after some webs where found. Rolled back to a single light'),
(6, 1, '2017-06-09 22:00:00', 'Air conditioner reslted to be broken. Must be replaced. Applied strong pestcide product agains red spiders. Starting with the anti eggs dust disolution. Introduced new extractor at the end of the air tubes system.'),
(7, 1, '2017-06-11 22:00:00', 'Installed new air conditioner. It\'s suffering overheating, probably caused by the hot air pipe\'s bended angles. Extraction system should be improved.'),
(8, 1, '2017-06-12 22:00:00', 'Begining of the lights and net structure construction. Air conditiones has been moved to the entrance door where can push the air out easilly. No more overheating detected. Added root stimulator to the disolution, and started intensive 24 hour period of lighting.  '),
(9, 1, '2017-06-13 22:00:00', 'dear diary. today sergi almost put his finger in my bum. it was nice.but it was too dry. love, emma.\r\n\r\nplant 18 had droopy leaves in the morning. we used the bubble stone to provide more oxygen to the water.  it was also sprayed with water a couple of times in the hopes of rehydration. No improvements yet. cause for droopy leaves undetermined.\r\n\r\nLight structure almost complete, switching back to 18h day light in hopes of reducing any possible stress on plant 18.'),
(10, 1, '2017-06-18 22:00:00', 'Dear diary,\r\nToday we finished building the structure, finally. I also deleafed the plants then applied the last application of the product to kill the spiders. Sergi did not stick his finger up my butt today,'),
(11, 1, '2017-06-20 22:00:00', 'Dear diary,\r\ntoday we plugged in a new light, yay! we also added a spinny fan. The dead plant has been resurected and came back to life. There are a couple amnesia plants that are beginning to curl at the top, not sure as to why. Today sergi also didn´t put anything in my butt.'),
(12, 1, '2017-06-24 22:00:00', 'Dear diary,\r\nToday was an extension of sexterday. there was lots of sex. I am amazing and did awesome detective work to uncover a new ailment to the babies: root rot. This explains the random dying plants, and why the first one has resurected, as well as the stunted growths, the leaf clawing, the deep green colour, and the burn on the amnesia leaves. The roots look healthy but we aren´t able to see them all. This leads us to believe that the issue is relatively new. We reduced the temp today by only using two lights and tried to keep the water cool by facing the A/C towards the tank.I also saw more of the firey red eight legged demons today. Sergi came twice. I think it was more. but he doesn´t. it was probably the speed. We added root stimulator yesterday to aid in new root growth.  Tomorrow we will buy supplies to tackle the bastard head on. love always, Emma');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `crop_plans`
--

CREATE TABLE `crop_plans` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

--
-- Volcado de datos para la tabla `crop_plans`
--

INSERT INTO `crop_plans` (`id`, `name`) VALUES
(1, 'Seeds (Slower)'),
(2, 'Clones (Shorter)'),
(3, 'Automatics (Shorter)'),
(4, 'Agresive (Faster)');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `crop_plans_conf`
--

CREATE TABLE `crop_plans_conf` (
  `id` int(11) NOT NULL,
  `crop_plan` int(11) NOT NULL COMMENT '(plans.id)',
  `day` int(11) NOT NULL COMMENT '(count)',
  `temperature` int(11) NOT NULL,
  `humidity` int(11) NOT NULL COMMENT '(relative %)',
  `ph` float NOT NULL,
  `ec` int(11) NOT NULL COMMENT '(μs)',
  `daytime` int(11) NOT NULL COMMENT '(hours)',
  `stage` enum('0','1','2') NOT NULL DEFAULT '1' COMMENT '0=germination, 1=vegetative, 2=flowering'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

--
-- Volcado de datos para la tabla `crop_plans_conf`
--

INSERT INTO `crop_plans_conf` (`id`, `crop_plan`, `day`, `temperature`, `humidity`, `ph`, `ec`, `daytime`, `stage`) VALUES
(1, 1, 1, 25, 65, 5.5, 400, 18, '0'),
(2, 1, 2, 25, 65, 5.5, 400, 18, '0'),
(3, 1, 3, 25, 65, 5.5, 400, 18, '0'),
(4, 1, 4, 25, 65, 5.5, 400, 18, '0'),
(5, 1, 5, 25, 65, 5.5, 400, 18, '0'),
(6, 1, 6, 25, 65, 5.5, 400, 18, '0'),
(7, 1, 7, 25, 65, 5.5, 400, 18, '0'),
(8, 1, 8, 25, 55, 5.6, 800, 18, '1'),
(9, 1, 9, 25, 55, 5.6, 800, 18, '1'),
(10, 1, 10, 25, 55, 5.6, 800, 18, '1'),
(11, 1, 11, 25, 55, 5.6, 800, 18, '1'),
(12, 1, 12, 25, 55, 5.6, 800, 18, '1'),
(13, 1, 13, 25, 55, 5.6, 800, 18, '1'),
(14, 1, 14, 25, 55, 5.6, 800, 18, '1'),
(15, 1, 15, 25, 55, 5.6, 800, 18, '1'),
(16, 1, 16, 25, 55, 5.6, 800, 18, '1'),
(17, 1, 17, 25, 55, 5.6, 800, 18, '1'),
(18, 1, 18, 25, 55, 5.6, 800, 18, '1'),
(19, 1, 19, 25, 55, 5.6, 800, 18, '1'),
(20, 1, 20, 25, 55, 5.6, 800, 18, '1'),
(21, 1, 21, 25, 55, 5.6, 800, 18, '1'),
(22, 1, 22, 25, 55, 5.8, 1100, 18, '1'),
(23, 1, 23, 25, 55, 5.8, 1100, 18, '1'),
(24, 1, 24, 25, 55, 5.8, 1100, 18, '1'),
(25, 1, 25, 25, 55, 5.8, 1100, 18, '1'),
(26, 1, 26, 25, 55, 5.8, 1100, 18, '1'),
(27, 1, 27, 25, 55, 5.8, 1100, 18, '1'),
(28, 1, 28, 25, 55, 5.8, 1100, 18, '1'),
(29, 1, 0, 0, 0, 0, 0, 0, '2');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `enviroment_log`
--

CREATE TABLE `enviroment_log` (
  `id` int(11) NOT NULL,
  `crop` int(11) NOT NULL,
  `crop_plan` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `temperature` int(11) NOT NULL,
  `humidity` int(11) NOT NULL COMMENT '(relative %)',
  `ph` float NOT NULL,
  `ec` int(11) NOT NULL COMMENT '(μs)',
  `lumens` int(11) NOT NULL DEFAULT '0' COMMENT '(W*115 in sodium)',
  `daytime` int(11) NOT NULL COMMENT '(hours)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

--
-- Volcado de datos para la tabla `enviroment_log`
--

INSERT INTO `enviroment_log` (`id`, `crop`, `crop_plan`, `date`, `temperature`, `humidity`, `ph`, `ec`, `lumens`, `daytime`) VALUES
(1, 1, 1, '2017-05-13 01:06:35', 26, 60, 5.8, 800, 45000, 18),
(2, 1, 1, '2017-05-14 01:06:35', 26, 60, 5.8, 1000, 45000, 18),
(3, 1, 1, '2017-05-15 01:06:35', 26, 60, 5.8, 1300, 45000, 18),
(4, 1, 1, '2017-05-16 01:06:35', 26, 60, 5.8, 1300, 45000, 18),
(5, 1, 1, '2017-05-17 01:06:35', 27, 62, 5.5, 1400, 45000, 18),
(6, 1, 1, '2017-05-18 01:06:35', 27, 64, 5.6, 1300, 45000, 18),
(7, 1, 1, '2017-05-19 01:06:35', 28, 60, 5.5, 1300, 45000, 18),
(8, 1, 1, '2017-05-20 01:06:35', 27, 60, 5.5, 1300, 45000, 18),
(9, 1, 1, '2017-05-21 01:06:35', 27, 64, 5.6, 1300, 45000, 18),
(10, 1, 1, '2017-05-22 01:06:35', 26, 60, 5.5, 1300, 45000, 24),
(11, 1, 1, '2017-05-23 01:06:35', 26, 60, 5.5, 1300, 45000, 18),
(12, 1, 1, '2017-05-23 22:27:50', 28, 50, 5.6, 1350, 45000, 18),
(13, 1, 1, '2017-05-24 22:27:50', 29, 45, 5.4, 1420, 45000, 18),
(14, 1, 1, '2017-05-25 22:27:50', 26, 48, 5.6, 1320, 45000, 18),
(15, 1, 1, '2017-05-26 22:27:50', 26, 45, 5.4, 1300, 45000, 18),
(16, 1, 1, '2017-05-27 22:27:50', 27, 43, 5.2, 1200, 45000, 18),
(17, 1, 1, '2017-05-28 22:27:50', 29, 42, 5.1, 1100, 45000, 18),
(18, 1, 1, '2017-05-29 22:27:50', 33, 38, 5, 1000, 45000, 18),
(19, 1, 1, '2017-05-30 22:27:50', 27, 45, 5, 900, 45000, 18),
(20, 1, 1, '2017-06-03 22:27:50', 29, 55, 5.5, 1400, 45000, 18),
(21, 1, 1, '2017-06-04 22:27:50', 29, 55, 5.3, 1300, 45000, 24),
(22, 1, 1, '2017-06-05 22:27:50', 29, 55, 5.4, 1500, 45000, 24),
(23, 1, 1, '2017-06-06 22:27:50', 26, 49, 5.5, 1000, 45000, 19),
(24, 1, 1, '2017-06-08 22:27:50', 29, 53, 5.5, 1000, 45000, 18),
(25, 1, 1, '2017-06-09 22:27:50', 29, 53, 6, 900, 45000, 20),
(26, 1, 1, '2017-06-10 22:27:50', 30, 45, 4.5, 500, 45000, 18),
(27, 1, 1, '2017-06-11 22:27:50', 30, 44, 5.6, 900, 45000, 18),
(28, 1, 1, '2017-06-12 22:27:50', 25, 45, 5.6, 1000, 90000, 24),
(29, 1, 1, '2017-06-13 22:27:50', 25, 45, 5.6, 1000, 90000, 24),
(30, 1, 1, '2017-06-17 22:27:50', 27, 58, 5.7, 1000, 90000, 18),
(31, 1, 1, '2017-06-18 22:27:50', 27, 54, 5.8, 1200, 90000, 18),
(32, 1, 1, '2017-06-19 22:27:50', 28, 56, 5.8, 1200, 90000, 18),
(33, 1, 1, '2017-06-20 22:27:50', 27, 52, 6, 1300, 135000, 24),
(34, 1, 1, '2017-06-21 22:27:50', 26, 52, 5.9, 1100, 135000, 20),
(35, 1, 1, '2017-06-22 22:27:50', 26, 52, 5.9, 1100, 90000, 18),
(36, 1, 1, '2017-06-24 22:27:50', 26, 52, 5.8, 1150, 90000, 18);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `knowledge`
--

CREATE TABLE `knowledge` (
  `id` int(11) NOT NULL,
  `category` int(11) NOT NULL,
  `subject` tinytext NOT NULL,
  `content` mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `plants`
--

CREATE TABLE `plants` (
  `id` int(11) NOT NULL,
  `status` enum('0','1') NOT NULL DEFAULT '1',
  `crop` int(11) NOT NULL,
  `spot` int(11) NOT NULL,
  `genetic` varchar(255) NOT NULL,
  `origin` enum('0','1') NOT NULL COMMENT '0=seed , 1=clone',
  `date_birth` timestamp NULL DEFAULT NULL,
  `date_insert` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_removal` timestamp NULL DEFAULT NULL,
  `comments` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Volcado de datos para la tabla `plants`
--

INSERT INTO `plants` (`id`, `status`, `crop`, `spot`, `genetic`, `origin`, `date_birth`, `date_insert`, `date_removal`, `comments`) VALUES
(1, '1', 1, 1, 'GSC', '1', '2017-02-25 23:00:00', '2017-05-12 22:00:00', NULL, 'M12'),
(2, '1', 1, 2, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, 'M12'),
(3, '0', 1, 3, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', 'M4'),
(4, '1', 1, 4, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, 'M13'),
(5, '1', 1, 5, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, 'M13'),
(6, '1', 1, 6, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, 'M13'),
(7, '0', 1, 7, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-29 22:00:00', 'M1'),
(8, '1', 1, 8, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, 'M6'),
(9, '0', 1, 9, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', 'M6'),
(10, '1', 1, 10, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, 'M14'),
(11, '0', 1, 11, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', 'M5'),
(12, '0', 1, 12, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', 'M1'),
(13, '0', 1, 13, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-30 22:00:00', 'M8'),
(14, '1', 1, 14, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, ''),
(15, '1', 1, 15, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, 'DOCS'),
(16, '1', 1, 16, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, ''),
(17, '0', 1, 17, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(18, '1', 1, 18, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, 'M14'),
(19, '1', 1, 19, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, ''),
(20, '0', 1, 20, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', 'M12'),
(21, '1', 1, 21, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, ''),
(22, '1', 1, 22, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, ''),
(23, '1', 1, 23, 'GSC', '1', NULL, '2017-05-12 22:00:00', NULL, ''),
(24, '0', 1, 24, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-25 22:00:00', ''),
(25, '0', 1, 25, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(26, '1', 1, 26, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', NULL, ''),
(27, '0', 1, 27, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(28, '0', 1, 28, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(29, '0', 1, 29, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(30, '1', 1, 30, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', NULL, ''),
(31, '0', 1, 31, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(32, '0', 1, 32, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(33, '0', 1, 33, 'Star Killer', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(34, '0', 1, 34, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', 'M1'),
(35, '0', 1, 35, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', 'M1'),
(36, '0', 1, 36, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-06-09 22:00:00', 'M6'),
(37, '0', 1, 37, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(38, '0', 1, 38, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(39, '0', 1, 39, 'GSC', '1', NULL, '2017-05-12 22:00:00', '2017-05-22 22:00:00', ''),
(40, '1', 1, 27, 'Amnesia', '1', NULL, '2017-05-22 22:00:00', NULL, NULL),
(41, '1', 1, 28, 'Amnesia', '1', NULL, '2017-05-23 21:27:14', NULL, NULL),
(42, '0', 1, 29, 'Amnesia', '1', NULL, '2017-05-23 21:27:56', '2017-05-25 22:00:00', NULL),
(43, '1', 1, 31, 'Amnesia', '1', NULL, '2017-05-23 21:27:56', NULL, NULL),
(44, '1', 1, 32, 'Amnesia', '1', NULL, '2017-05-23 21:29:14', NULL, NULL),
(45, '1', 1, 33, 'Amnesia', '1', NULL, '2017-05-23 21:29:14', NULL, NULL),
(46, '0', 1, 34, 'Amnesia', '1', NULL, '2017-05-23 21:29:45', '2017-05-25 22:00:00', NULL),
(47, '1', 1, 35, 'Amnesia', '1', NULL, '2017-05-23 21:29:45', NULL, NULL),
(48, '1', 1, 37, 'Amnesia', '1', NULL, '2017-05-23 21:30:14', NULL, NULL),
(49, '0', 1, 38, 'Amnesia', '1', NULL, '2017-05-23 21:30:14', '2017-05-29 22:00:00', NULL),
(50, '1', 1, 39, 'Amnesia', '1', NULL, '2017-05-23 21:30:28', NULL, NULL),
(51, '1', 1, 9, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-27 19:29:27', NULL, NULL),
(52, '1', 1, 11, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-27 19:29:27', NULL, NULL),
(53, '1', 1, 12, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-27 19:29:27', NULL, NULL),
(54, '1', 1, 17, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-28 19:29:27', NULL, NULL),
(55, '1', 1, 20, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-28 19:29:27', NULL, NULL),
(56, '1', 1, 24, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-28 22:00:00', NULL, NULL),
(57, '1', 1, 25, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-28 22:00:00', NULL, NULL),
(58, '1', 1, 29, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-28 22:00:00', NULL, NULL),
(59, '1', 1, 34, 'OG KUSH', '0', '2017-05-23 22:00:00', '2017-05-28 22:00:00', NULL, NULL),
(60, '1', 1, 3, 'SHARK', '0', '2017-05-23 22:00:00', '2017-05-31 22:00:00', NULL, NULL),
(61, '1', 1, 7, 'SHARK', '0', '2017-05-23 22:00:00', '2017-05-31 22:00:00', NULL, NULL),
(62, '1', 1, 38, 'SHARK', '0', '2017-05-23 22:00:00', '2017-05-31 22:00:00', NULL, NULL),
(63, '1', 1, 13, 'SHARK', '0', '2017-05-23 22:00:00', '2017-05-31 22:00:00', NULL, NULL),
(64, '1', 1, 40, 'SHARK', '0', '2017-05-23 22:00:00', '2017-06-04 22:00:00', NULL, NULL),
(65, '1', 1, 41, 'SHARK', '0', '2017-05-23 22:00:00', '2017-06-04 22:00:00', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `spots`
--

CREATE TABLE `spots` (
  `id` int(11) NOT NULL,
  `crop` int(11) NOT NULL,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Volcado de datos para la tabla `spots`
--

INSERT INTO `spots` (`id`, `crop`, `name`) VALUES
(1, 1, 'HOLE-1'),
(2, 1, 'HOLE-2'),
(3, 1, 'HOLE-3'),
(4, 1, 'HOLE-4'),
(5, 1, 'HOLE-5'),
(6, 1, 'HOLE-6'),
(7, 1, 'HOLE-7'),
(8, 1, 'HOLE-8'),
(9, 1, 'HOLE-9'),
(10, 1, 'HOLE-10'),
(11, 1, 'HOLE-11'),
(12, 1, 'HOLE-12'),
(13, 1, 'HOLE-13'),
(14, 1, 'HOLE-14'),
(15, 1, 'HOLE-15'),
(16, 1, 'HOLE-16'),
(17, 1, 'HOLE-17'),
(18, 1, 'HOLE-18'),
(19, 1, 'HOLE-19'),
(20, 1, 'HOLE-20'),
(21, 1, 'HOLE-21'),
(22, 1, 'HOLE-22'),
(23, 1, 'HOLE-23'),
(24, 1, 'HOLE-24'),
(25, 1, 'HOLE-25'),
(26, 1, 'HOLE-26'),
(27, 1, 'HOLE-27'),
(28, 1, 'HOLE-28'),
(29, 1, 'HOLE-29'),
(30, 1, 'HOLE-30'),
(31, 1, 'HOLE-31'),
(32, 1, 'HOLE-32'),
(33, 1, 'HOLE-33'),
(34, 1, 'HOLE-34'),
(35, 1, 'HOLE-35'),
(36, 1, 'HOLE-36'),
(37, 1, 'HOLE-37'),
(38, 1, 'HOLE-38'),
(39, 1, 'HOLE-39'),
(40, 1, 'HOLE-40'),
(41, 1, 'HOLE-41'),
(42, 1, 'HOLE-42'),
(43, 1, 'HOLE-43');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `crops`
--
ALTER TABLE `crops`
  ADD PRIMARY KEY (`id`),
  ADD KEY `plan` (`crop_plan`),
  ADD KEY `status` (`status`);

--
-- Indices de la tabla `crop_log`
--
ALTER TABLE `crop_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `crop` (`crop`);

--
-- Indices de la tabla `crop_plans`
--
ALTER TABLE `crop_plans`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `crop_plans_conf`
--
ALTER TABLE `crop_plans_conf`
  ADD PRIMARY KEY (`id`),
  ADD KEY `plan` (`crop_plan`);

--
-- Indices de la tabla `enviroment_log`
--
ALTER TABLE `enviroment_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `plan` (`crop_plan`),
  ADD KEY `crop` (`crop`);

--
-- Indices de la tabla `knowledge`
--
ALTER TABLE `knowledge`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `plants`
--
ALTER TABLE `plants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `status` (`status`),
  ADD KEY `crop` (`crop`) USING BTREE,
  ADD KEY `spot` (`spot`);

--
-- Indices de la tabla `spots`
--
ALTER TABLE `spots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `crop` (`crop`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `crops`
--
ALTER TABLE `crops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT de la tabla `crop_log`
--
ALTER TABLE `crop_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
--
-- AUTO_INCREMENT de la tabla `crop_plans`
--
ALTER TABLE `crop_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
--
-- AUTO_INCREMENT de la tabla `crop_plans_conf`
--
ALTER TABLE `crop_plans_conf`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;
--
-- AUTO_INCREMENT de la tabla `enviroment_log`
--
ALTER TABLE `enviroment_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;
--
-- AUTO_INCREMENT de la tabla `knowledge`
--
ALTER TABLE `knowledge`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT de la tabla `plants`
--
ALTER TABLE `plants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;
--
-- AUTO_INCREMENT de la tabla `spots`
--
ALTER TABLE `spots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;
--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `crops`
--
ALTER TABLE `crops`
  ADD CONSTRAINT `crops_ibfk_1` FOREIGN KEY (`crop_plan`) REFERENCES `crop_plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `crop_log`
--
ALTER TABLE `crop_log`
  ADD CONSTRAINT `crop_log_ibfk_1` FOREIGN KEY (`crop`) REFERENCES `crops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `crop_plans_conf`
--
ALTER TABLE `crop_plans_conf`
  ADD CONSTRAINT `crop_plans_conf_ibfk_1` FOREIGN KEY (`crop_plan`) REFERENCES `crop_plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `enviroment_log`
--
ALTER TABLE `enviroment_log`
  ADD CONSTRAINT `enviroment_log_ibfk_1` FOREIGN KEY (`crop_plan`) REFERENCES `crop_plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `enviroment_log_ibfk_2` FOREIGN KEY (`crop`) REFERENCES `crops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `plants`
--
ALTER TABLE `plants`
  ADD CONSTRAINT `plants_ibfk_1` FOREIGN KEY (`crop`) REFERENCES `crops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `plants_ibfk_2` FOREIGN KEY (`spot`) REFERENCES `spots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `spots`
--
ALTER TABLE `spots`
  ADD CONSTRAINT `spots_ibfk_1` FOREIGN KEY (`crop`) REFERENCES `crops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
